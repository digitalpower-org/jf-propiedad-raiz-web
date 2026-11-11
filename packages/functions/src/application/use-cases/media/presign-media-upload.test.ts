import { describe, expect, it, vi } from 'vitest';

import { PresignMediaUploadUseCase } from './presign-media-upload';

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

describe('PresignMediaUploadUseCase', () => {
  it('llena mediaStorage.presignPut con nombre y mimeType', async () => {
    const ports = makePorts();
    const useCase = new PresignMediaUploadUseCase(
      ports.mediaStorage,
      ports.logger,
    );

    ports.mediaStorage.presignPut.mockResolvedValue({
      url: 'https://bucket.r2.cloudflarestorage.com/pending/abc-123.jpg',
      key: 'pending/abc-123.jpg',
      expiresInSeconds: 900,
    });
    const resultado = await useCase.execute({
      nombre: 'foto.jpg',
      mimeType: 'image/jpeg',
    });

    expect(ports.mediaStorage.presignPut).toHaveBeenCalledWith(
      'foto.jpg',
      'image/jpeg',
    );
    expect(ports.logger.debug).toHaveBeenCalledWith('media_presigned', {
      key: resultado.key,
    });
  });

  it('propaga el error si mediaStorage.presignPut falla', async () => {
    const ports = makePorts();
    ports.mediaStorage.presignPut.mockRejectedValue(new Error('error_presignando'));

    const useCase = new PresignMediaUploadUseCase(
      ports.mediaStorage,
      ports.logger,
    );

    await expect(
      useCase.execute({ nombre: 'foto.jpg', mimeType: 'image/jpeg' }),
    ).rejects.toThrow('error_presignando');
  });
});
