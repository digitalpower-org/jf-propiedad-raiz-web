import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { MediaStorage } from '../../ports/media-storage';
import type { PresignPutResult } from '../../ports/media-storage';
import { ApiError, errorCode } from '../../../domain/errors/api-error';

export interface PresignMediaUploadCommand {
  readonly nombre: string;
  readonly mimeType: string;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * US1.8 — Firmar una URL PUT presignada en R2 (prefijo `pending/`).
 * Valida el rol de administrador y el tipo MIME antes de firmar.
 */
export class PresignMediaUploadUseCase implements UseCase<
  PresignMediaUploadCommand,
  PresignPutResult
> {
  constructor(
    private readonly mediaStorage: MediaStorage,
    private readonly logger: Logger,
  ) {}

  async execute(command: PresignMediaUploadCommand): Promise<PresignPutResult> {
    if (!ALLOWED_MIME_TYPES.includes(command.mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw new ApiError(errorCode.unsupportedMedia, 'Tipo MIME no soportado');
    }

    const resultado = await this.mediaStorage.presignPut(command.nombre, command.mimeType);

    this.logger.debug('media_presigned', { key: resultado.key });

    return resultado;
  }
}
