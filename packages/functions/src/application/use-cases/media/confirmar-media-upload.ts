import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { MediaStorage } from '../../ports/media-storage';
import type { PropertiesRepository } from '../../ports/properties-repository';
import type { RecursoMedia } from '@jf/shared-types';
import type { ConfirmarSubidaResult } from '../../ports/media-storage';

export interface ConfirmarMediaUploadCommand {
  readonly key: string;
  readonly recurso: RecursoMedia;
  readonly propertyId?: string;
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
    private readonly properties: PropertiesRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: ConfirmarMediaUploadCommand): Promise<ConfirmarSubidaResult> {
    const resultado = await this.mediaStorage.confirmarSubida(command.key, command.recurso);

    if (command.propertyId) {
      await this.vincularMediaAPropiedad(command.propertyId, command.recurso, resultado.derivados);
    }

    this.logger.info('media_confirmed', {
      key: command.key,
      recurso: command.recurso,
      derivados: resultado.derivados.length,
    });

    return resultado;
  }

  private async vincularMediaAPropiedad(
    propertyId: string,
    recurso: RecursoMedia,
    derivados: readonly { readonly clave: string; readonly ancho: number }[],
  ): Promise<void> {
    const existente = await this.properties.findByIdOrSlug(propertyId, false);
    if (!existente) {
      this.logger.warn('media_vinculacion_propiedad_no_encontrada', { propertyId });
      return;
    }

    const nuevoElemento = {
      derivados: derivados.map((d) => ({ clave: d.clave, ancho: d.ancho })),
    };

    if (recurso === 'foto') {
      const fotos = [...(existente.property.fotos ?? []), nuevoElemento];
      await this.properties.update(propertyId, { fotos });
    } else {
      const panoramas = [...(existente.property.panoramas ?? []), nuevoElemento];
      await this.properties.update(propertyId, { panoramas });
    }
  }
}
