import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotFound } from '@aws-sdk/client-s3';

import type { ImageProcessor } from '../../application/ports/image-processor';
import { createR2MediaStorage } from './r2-media-storage';
import { ApiError } from '../../domain/errors/api-error';
import { errorCode } from '../../domain/errors/errorCatalog';

const mockR2Storage = vi.hoisted(() => ({
  presignPut: vi.fn(),
  head: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
  getRange: vi.fn(),
}));

vi.mock('../storage/r2-storage', () => ({
  presignPut: mockR2Storage.presignPut,
  head: mockR2Storage.head,
  put: mockR2Storage.put,
  del: mockR2Storage.del,
  getRange: mockR2Storage.getRange,
}));

const mockImageProcessor = {
  validarImagen: vi.fn(),
  generarDerivados: vi.fn(),
};

describe('createR2MediaStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('presignPut genera una clave con prefijo pending/ y llama a r2PresignPut', async () => {
    mockR2Storage.presignPut.mockResolvedValue({
      url: 'https://bucket/pending/abc.jpg',
      key: 'pending/abc.jpg',
      expiresIn: 900,
    });

    const storage = createR2MediaStorage(mockImageProcessor as unknown as ImageProcessor);
    const resultado = await storage.presignPut('foto.jpg', 'image/jpeg');

    expect(mockR2Storage.presignPut).toHaveBeenCalledWith(
      expect.stringMatching(/^pending\/[a-f0-9-]+\.jpg$/),
      'image/jpeg',
      900,
    );
    expect(resultado.key).toMatch(/^pending\//);
    expect(resultado.expiresInSeconds).toBe(900);
  });

  it('confirmarSubida orquesta head, descarga, validación, derivados, subida y eliminación', async () => {
    mockR2Storage.head.mockResolvedValue({ contentType: 'image/jpeg', contentLength: 1000 });
    mockImageProcessor.validarImagen.mockResolvedValue({ ancho: 1000, alto: 800 });
    mockImageProcessor.generarDerivados.mockResolvedValue({
      derivados: [
        { clave: 'foto-320.webp', ancho: 320, buffer: Buffer.from('d1') },
        { clave: 'foto-640.webp', ancho: 640, buffer: Buffer.from('d2') },
      ],
    });
    mockR2Storage.getRange.mockResolvedValue({
      body: [Buffer.from('chunk')] as unknown as AsyncIterable<Uint8Array>,
    });

    const storage = createR2MediaStorage(mockImageProcessor as unknown as ImageProcessor);
    const resultado = await storage.confirmarSubida('pending/abc-123.jpg', 'foto');

    expect(mockR2Storage.head).toHaveBeenCalledWith('pending/abc-123.jpg');
    expect(mockImageProcessor.validarImagen).toHaveBeenCalled();
    expect(mockImageProcessor.generarDerivados).toHaveBeenCalled();
    expect(mockR2Storage.put).toHaveBeenCalledTimes(2);
    expect(mockR2Storage.del).toHaveBeenCalledWith('pending/abc-123.jpg');
    expect(resultado.derivados).toHaveLength(2);
  });

  it('confirmarSubida rechaza clave sin prefijo pending/ con VALIDATION_ERROR', async () => {
    const storage = createR2MediaStorage(mockImageProcessor as unknown as ImageProcessor);

    await expect(storage.confirmarSubida('otra/ruta.jpg', 'foto')).rejects.toEqual(
      expect.objectContaining({
        code: errorCode.validationError,
        message: 'Clave inválida: debe comenzar con pending/',
        details: [{ field: 'key', issue: 'La clave debe estar en pending/' }],
      }),
    );
    expect(mockR2Storage.head).not.toHaveBeenCalled();
    expect(mockImageProcessor.validarImagen).not.toHaveBeenCalled();
  });

  it('confirmarSubida limpia derivados subidos y conserva original si falla la subida de un derivado', async () => {
    mockR2Storage.head.mockResolvedValue({ contentType: 'image/jpeg', contentLength: 1000 });
    mockImageProcessor.validarImagen.mockResolvedValue({ ancho: 1000, alto: 800 });
    mockImageProcessor.generarDerivados.mockResolvedValue({
      derivados: [
        { clave: 'foto-320.webp', ancho: 320, buffer: Buffer.from('d1') },
        { clave: 'foto-640.webp', ancho: 640, buffer: Buffer.from('d2') },
      ],
    });
    mockR2Storage.getRange.mockResolvedValue({
      body: [Buffer.from('chunk')] as unknown as AsyncIterable<Uint8Array>,
    });
    // Primer put OK, segundo falla
    mockR2Storage.put
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('R2 upload failed'));

    const storage = createR2MediaStorage(mockImageProcessor as unknown as ImageProcessor);

    await expect(storage.confirmarSubida('pending/abc-123.jpg', 'foto')).rejects.toThrow(
      'R2 upload failed',
    );

    // Verificar que se intentó subir ambos
    expect(mockR2Storage.put).toHaveBeenCalledTimes(2);
    // Verificar que se limpió el primer derivado subido
    expect(mockR2Storage.del).toHaveBeenCalledWith('derivados/foto/foto-320.webp');
    // Verificar que NO se borró el original
    expect(mockR2Storage.del).not.toHaveBeenCalledWith('pending/abc-123.jpg');
  });

  it('confirmarSubida propaga error de validación de imagen (UNSUPPORTED_MEDIA, IMAGE_TOO_LARGE, etc.)', async () => {
    mockR2Storage.head.mockResolvedValue({ contentType: 'image/gif', contentLength: 1000 });
    mockImageProcessor.validarImagen.mockRejectedValue(
      new ApiError(errorCode.unsupportedMedia, 'Tipo de contenido no soportado', [
        { field: 'mimeType', issue: 'Tipo no permitido: image/gif' },
      ]),
    );
    mockR2Storage.getRange.mockResolvedValue({
      body: [Buffer.from('chunk')] as unknown as AsyncIterable<Uint8Array>,
    });

    const storage = createR2MediaStorage(mockImageProcessor as unknown as ImageProcessor);

    await expect(storage.confirmarSubida('pending/abc-123.jpg', 'foto')).rejects.toEqual(
      expect.objectContaining({
        code: errorCode.unsupportedMedia,
      }),
    );
    // No se deben haber subido derivados ni borrado el original
    expect(mockR2Storage.put).not.toHaveBeenCalled();
    expect(mockR2Storage.del).not.toHaveBeenCalled();
  });

  it('confirmarSubida lanza NOT_FOUND cuando el objeto no existe en R2', async () => {
    const notFoundError = new NotFound({
      message: 'Not Found',
      $metadata: { httpStatusCode: 404 },
    });
    mockR2Storage.head.mockRejectedValueOnce(notFoundError);

    const storage = createR2MediaStorage(mockImageProcessor as unknown as ImageProcessor);

    await expect(storage.confirmarSubida('pending/abc-123.jpg', 'foto')).rejects.toEqual(
      expect.objectContaining({ code: errorCode.notFound }),
    );

    expect(mockImageProcessor.validarImagen).not.toHaveBeenCalled();
    expect(mockImageProcessor.generarDerivados).not.toHaveBeenCalled();
    expect(mockR2Storage.put).not.toHaveBeenCalled();
    expect(mockR2Storage.del).not.toHaveBeenCalled();
  });

  it('deleteDerivados borra cada derivado bajo derivados/<recurso>/', async () => {
    const storage = createR2MediaStorage(mockImageProcessor as unknown as ImageProcessor);
    await storage.deleteDerivados(['clave-320.webp', 'clave-full.webp'], 'foto');

    expect(mockR2Storage.del).toHaveBeenCalledTimes(2);
    expect(mockR2Storage.del).toHaveBeenCalledWith('derivados/foto/clave-320.webp');
    expect(mockR2Storage.del).toHaveBeenCalledWith('derivados/foto/clave-full.webp');
  });

  it('deleteDerivados borra derivados de panorama', async () => {
    const storage = createR2MediaStorage(mockImageProcessor as unknown as ImageProcessor);
    await storage.deleteDerivados(['clave-full.webp'], 'panorama');

    expect(mockR2Storage.del).toHaveBeenCalledTimes(1);
    expect(mockR2Storage.del).toHaveBeenCalledWith('derivados/panorama/clave-full.webp');
  });
});
