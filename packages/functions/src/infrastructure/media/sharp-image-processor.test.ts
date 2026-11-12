import { describe, expect, it, vi, beforeEach } from 'vitest';

import { createSharpImageProcessor } from './sharp-image-processor';

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

  it('rechaza una imagen sin dimensiones', async () => {
    (mockSharp().metadata as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      width: undefined,
      height: undefined,
    });
    const processor = createSharpImageProcessor();

    await expect(processor.validarImagen(Buffer.from('imagen'), 'image/jpeg')).rejects.toThrow(
      'Imagen sin dimensiones válidas',
    );
  });

  it('rechaza una imagen demasiado pequeña', async () => {
    (mockSharp().metadata as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      width: 100,
      height: 100,
    });
    const processor = createSharpImageProcessor();

    await expect(processor.validarImagen(Buffer.from('imagen'), 'image/jpeg')).rejects.toThrow(
      'Imagen demasiado pequeña',
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
});
