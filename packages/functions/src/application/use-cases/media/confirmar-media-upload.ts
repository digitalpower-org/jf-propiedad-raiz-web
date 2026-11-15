import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { MediaStorage } from '../../ports/media-storage';
import type { RecursoMedia } from '@jf/shared-types';
import type { ConfirmarSubidaResult } from '../../ports/media-storage';

export interface ConfirmarMediaUploadCommand {
  readonly key: string;
  readonly recurso: RecursoMedia;
}

/**
 * US1.9 — Confirmar subida, validar por cabecera y generar derivados WebP.
 * El archivo ya está en `pending/`; el backend valida (tipo → peso → dimensiones
 * mínimas → tope de píxeles → proporción), genera derivados y elimina el original.
 */
export class ConfirmarMediaUploadUseCase implements UseCase<
  ConfirmarMediaUploadCommand,
  ConfirmarSubidaResult
> {
  constructor(
    private readonly mediaStorage: MediaStorage,
    private readonly logger: Logger,
  ) {}

  async execute(command: ConfirmarMediaUploadCommand): Promise<ConfirmarSubidaResult> {
    const resultado = await this.mediaStorage.confirmarSubida(command.key, command.recurso);

    this.logger.info('media_confirmed', {
      key: command.key,
      recurso: command.recurso,
      derivados: resultado.derivados.length,
    });

    return resultado;
  }
}
