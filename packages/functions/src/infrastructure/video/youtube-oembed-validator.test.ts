import { afterEach, describe, expect, it, vi } from 'vitest';

import { YouTubeOEmbedValidator } from './youtube-oembed-validator';

function makeLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe('YouTubeOEmbedValidator', () => {
  it('valida una URL de YouTube correctamente', async () => {
    const logger = makeLogger();
    const validator = new YouTubeOEmbedValidator(logger);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ title: 'Video de prueba' }),
      }),
    );

    await expect(
      validator.validate('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    ).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledWith(
      'https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ&format=json',
    );
  });

  it('lanza error cuando la URL de YouTube no existe (404)', async () => {
    const logger = makeLogger();
    const validator = new YouTubeOEmbedValidator(logger);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }),
    );

    await expect(validator.validate('https://www.youtube.com/watch?v=invalido')).rejects.toThrow(
      'URL de YouTube inválida',
    );
  });

  it('lanza error cuando fetch falla', async () => {
    const logger = makeLogger();
    const validator = new YouTubeOEmbedValidator(logger);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    await expect(validator.validate('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).rejects.toThrow(
      'No se pudo validar la URL de YouTube',
    );
  });

  it('valida una URL de YouTube corta (youtu.be)', async () => {
    const logger = makeLogger();
    const validator = new YouTubeOEmbedValidator(logger);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ title: 'Video corto' }),
      }),
    );

    await expect(validator.validate('https://youtu.be/dQw4w9WgXcQ')).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});
