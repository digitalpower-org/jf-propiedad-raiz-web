import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createSharpImageProcessor } from './sharp-image-processor';
import { errorCode } from '../../domain/errors/errorCatalog';

const mockSharp = vi.hoisted(() =>
  vi.fn().mockReturnValue({
    metadata: vi.fn().mockResolvedValue({ width: 1000, height: 800 }),
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('derivado-webp')),
  }),
);

vi.mock('sharp', () => ({
  default: mockSharp,
}));

describe('createSharpImageProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('valida una imagen con dimensiones válidas', async () => {
    const processor = createSharpImageProcessor();
    const buffer = Buffer.from('imagen-falsa');

    const resultado = await processor.validarImagen(buffer, 'image/jpeg');

    expect(mockSharp).toHaveBeenCalledWith(buffer);
    expect(resultado).toEqual({ ancho: 1000, alto: 800 });
  });

  it('rechaza una imagen sin dimensiones con VALIDATION_ERROR', async () => {
    (mockSharp().metadata as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      width: undefined,
      height: undefined,
    });
    const processor = createSharpImageProcessor();

    await expect(processor.validarImagen(Buffer.from('imagen'), 'image/jpeg')).rejects.toEqual(
      expect.objectContaining({
        code: errorCode.validationError,
        message: 'Imagen sin dimensiones válidas',
        details: [{ field: 'image', issue: 'No se pudieron leer las dimensiones' }],
      }),
    );
  });

  it('rechaza MIME type no soportado con UNSUPPORTED_MEDIA', async () => {
    const processor = createSharpImageProcessor();

    await expect(processor.validarImagen(Buffer.from('imagen'), 'image/gif')).rejects.toEqual(
      expect.objectContaining({
        code: errorCode.unsupportedMedia,
        message: 'Tipo de contenido no soportado',
        details: [{ field: 'mimeType', issue: 'Tipo no permitido: image/gif' }],
      }),
    );
  });

  it('rechaza una imagen demasiado pequeña con IMAGE_TOO_SMALL', async () => {
    (mockSharp().metadata as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      width: 100,
      height: 100,
    });
    const processor = createSharpImageProcessor();

    await expect(processor.validarImagen(Buffer.from('imagen'), 'image/jpeg')).rejects.toEqual(
      expect.objectContaining({
        code: errorCode.imageTooSmall,
        message: 'Imagen demasiado pequeña: lado mayor 100px, mínimo 800px',
        details: [{ field: 'image', issue: 'Lado mayor 100px < 800px' }],
      }),
    );
  });

  it('rechaza una imagen demasiado grande en píxeles con IMAGE_TOO_LARGE', async () => {
    (mockSharp().metadata as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      width: 10000,
      height: 10000,
    });
    const processor = createSharpImageProcessor();

    await expect(processor.validarImagen(Buffer.from('imagen'), 'image/jpeg')).rejects.toEqual(
      expect.objectContaining({
        code: errorCode.imageTooLarge,
        message: 'Imagen demasiado grande: 100000000px, máximo 50000000px',
        details: [{ field: 'image', issue: 'Píxeles 100000000 > 50000000' }],
      }),
    );
  });

  it('genera derivados para anchuras objetivo menores o iguales a la original', async () => {
    const processor = createSharpImageProcessor();
    const buffer = Buffer.from('imagen-falsa');

    const resultado = await processor.generarDerivados(buffer, 'foto');

    expect(resultado.derivados.length).toBeGreaterThan(0);
    expect(mockSharp().resize).toHaveBeenCalled();
    expect(mockSharp().webp).toHaveBeenCalled();
    expect(mockSharp().toBuffer).toHaveBeenCalled();
  });

  it('acepta MIME types permitidos: jpeg, png, webp', async () => {
    const processor = createSharpImageProcessor();

    for (const mime of ['image/jpeg', 'image/png', 'image/webp'] as const) {
      await expect(processor.validarImagen(Buffer.from('imagen'), mime)).resolves.toEqual({
        ancho: 1000,
        alto: 800,
      });
    }
  });
});
