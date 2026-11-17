/**
 * Adaptador de validación de videos de YouTube vía oEmbed (US1.9 / US4.x).
 *
 * Llama al endpoint público de YouTube oEmbed para verificar que una URL
 * de video exista y sea accesible. No requiere API key.
 */

import type { Logger } from '../../application/ports/logger';
import type { VideoValidator } from '../../application/ports/video-validator';
import { ApiError } from '../../domain/errors/api-error';
import { errorCode } from '../../domain/errors/errorCatalog';

const YOUTUBE_OEMBED_URL = 'https://www.youtube.com/oembed';

export class YouTubeOEmbedValidator implements VideoValidator {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async validate(url: string): Promise<void> {
    try {
      const response = await fetch(
        `${YOUTUBE_OEMBED_URL}?url=${encodeURIComponent(url)}&format=json`,
      );

      if (!response.ok) {
        this.logger.warn('youtube_oembed_invalid_url', { url, status: response.status });
        throw new ApiError(errorCode.validationError, `URL de YouTube inválida: ${url}`);
      }

      await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      this.logger.warn('youtube_oembed_validation_error', { url, error: String(error) });
      throw new ApiError(errorCode.validationError, `No se pudo validar la URL de YouTube: ${url}`);
    }
  }
}
