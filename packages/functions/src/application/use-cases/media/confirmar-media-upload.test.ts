import { describe, expect, it, vi } from 'vitest';

import { ConfirmarMediaUploadUseCase } from './confirmar-media-upload';

function makePorts() {
  return {
    mediaStorage: {
      presignPut: vi.fn(),
      confirmarSubida: vi.fn(),
    },
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
}

describe('ConfirmarMediaUploadUseCase', () => {
  it('llena mediaStorage.confirmarSubida con key y recurso', async () => {
    const ports = makePorts();
    const useCase = new ConfirmarMediaUploadUseCase(
      ports.mediaStorage,
      ports.logger,
    );

    ports.mediaStorage.confirmarSubida.mockResolvedValue({
      derivados: [{ clave: 'abc-123-320.webp', ancho: 320 }],
    });
    const resultado = await useCase.execute({
      key: 'pending/abc-123.jpg',
      recurso: 'foto',
    });

    expect(ports.mediaStorage.confirmarSubida).toHaveBeenCalledWith(
      'pending/abc-123.jpg',
      'foto',
    );
    expect(ports.logger.info).toHaveBeenCalledWith('media_confirmed', {
      key: 'pending/abc-123.jpg',
      recurso: 'foto',
      derivados: resultado.derivados.length,
    });
  });

  it('propaga el error si mediaStorage.confirmarSubida falla', async () => {
    const ports = makePorts();
    ports.mediaStorage.confirmarSubida.mockRejectedValue(
      new Error('error_confirmando'),
    );

    const useCase = new ConfirmarMediaUploadUseCase(
      ports.mediaStorage,
      ports.logger,
    );

    await expect(
      useCase.execute({ key: 'pending/abc-123.jpg', recurso: 'foto' }),
    ).rejects.toThrow('error_confirmando');
  });
});
