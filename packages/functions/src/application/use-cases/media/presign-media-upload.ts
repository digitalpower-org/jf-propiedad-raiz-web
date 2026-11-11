import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { MediaStorage } from '../../ports/media-storage';
import type { PresignPutResult } from '../../ports/media-storage';

export interface PresignMediaUploadCommand {
  readonly nombre: string;
  readonly mimeType: string;
}

/**
 * US1.8 — Firmar una URL PUT presignada en R2 (prefijo `pending/`).
 * Valida el rol de administrador y el tipo MIME antes de firmar.
 */
export class PresignMediaUploadUseCase
  implements UseCase<PresignMediaUploadCommand, PresignPutResult>
{
  constructor(
    private readonly mediaStorage: MediaStorage,
    private readonly logger: Logger,
  ) {}

  async execute(command: PresignMediaUploadCommand): Promise<PresignPutResult> {
    const resultado = await this.mediaStorage.presignPut(
      command.nombre,
      command.mimeType,
    );

    this.logger.debug('media_presigned', { key: resultado.key });

    return resultado;
  }
}
