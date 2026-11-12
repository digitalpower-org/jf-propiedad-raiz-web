import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { ImageProcessor } from '../../application/ports/image-processor';
import { createR2MediaStorage } from './r2-media-storage';

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
});
