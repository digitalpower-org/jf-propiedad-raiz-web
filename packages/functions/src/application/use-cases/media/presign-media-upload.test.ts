import { describe, expect, it, vi } from 'vitest';

import { PresignMediaUploadUseCase } from './presign-media-upload';
import { errorCode } from '../../../domain/errors/api-error';

function makePorts() {
  return {
    mediaStorage: {
      presignPut: vi.fn(),
      confirmarSubida: vi.fn(),
      deleteDerivados: vi.fn(),
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
    const useCase = new PresignMediaUploadUseCase(ports.mediaStorage, ports.logger);

    ports.mediaStorage.presignPut.mockResolvedValue({
      url: 'https://bucket.r2.cloudflarestorage.com/pending/abc-123.jpg',
      key: 'pending/abc-123.jpg',
      expiresInSeconds: 900,
    });
    const resultado = await useCase.execute({
      nombre: 'foto.jpg',
      mimeType: 'image/jpeg',
    });

    expect(ports.mediaStorage.presignPut).toHaveBeenCalledWith('foto.jpg', 'image/jpeg');
    expect(ports.logger.debug).toHaveBeenCalledWith('media_presigned', {
      key: resultado.key,
    });
  });

  it('propaga el error si mediaStorage.presignPut falla', async () => {
    const ports = makePorts();
    ports.mediaStorage.presignPut.mockRejectedValue(new Error('error_presignando'));

    const useCase = new PresignMediaUploadUseCase(ports.mediaStorage, ports.logger);

    await expect(useCase.execute({ nombre: 'foto.jpg', mimeType: 'image/jpeg' })).rejects.toThrow(
      'error_presignando',
    );
  });

  it('lanza UNSUPPORTED_MEDIA para MIME inválido', async () => {
    const ports = makePorts();
    const useCase = new PresignMediaUploadUseCase(ports.mediaStorage, ports.logger);

    await expect(
      useCase.execute({ nombre: 'foto.gif', mimeType: 'image/gif' }),
    ).rejects.toMatchObject({
      code: errorCode.unsupportedMedia,
      message: 'Tipo MIME no soportado',
    });
    expect(ports.mediaStorage.presignPut).not.toHaveBeenCalled();
  });

  it('acepta image/png y image/webp como MIME válidos', async () => {
    const ports = makePorts();
    const useCase = new PresignMediaUploadUseCase(ports.mediaStorage, ports.logger);

    ports.mediaStorage.presignPut.mockResolvedValue({
      url: 'https://bucket/pending/abc.png',
      key: 'pending/abc.png',
      expiresInSeconds: 900,
    });

    await useCase.execute({ nombre: 'foto.png', mimeType: 'image/png' });
    expect(ports.mediaStorage.presignPut).toHaveBeenCalledWith('foto.png', 'image/png');

    ports.mediaStorage.presignPut.mockResolvedValue({
      url: 'https://bucket/pending/abc.webp',
      key: 'pending/abc.webp',
      expiresInSeconds: 900,
    });

    await useCase.execute({ nombre: 'foto.webp', mimeType: 'image/webp' });
    expect(ports.mediaStorage.presignPut).toHaveBeenCalledWith('foto.webp', 'image/webp');
  });
});
