// US4.4.4 — Eliminar un servicio (soft delete a `DELETED`).
// Purga los derivados de las fotos del servicio borrado y revalida 'servicios'.

import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { ServiciosRepository } from '../../ports/services-repository';
import type { Foto } from '@jf/shared-types';
import type { MediaStorage } from '../../ports/media-storage';
import { RevalidateContent } from '../../revalidation/revalidate-content';

export interface EliminarServiceCommand {
  readonly idOrSlug: string;
  readonly requestId?: string;
}

export interface EliminarServiceDeps {
  readonly services: ServiciosRepository;
  readonly revalidateContent: RevalidateContent;
  readonly mediaStorage: MediaStorage;
  readonly logger: Logger;
}

export class EliminarServiceUseCase implements UseCase<
  EliminarServiceCommand,
  { service: { readonly id: string; readonly slug: string } }
> {
  private readonly services: ServiciosRepository;
  private readonly revalidateContent: RevalidateContent;
  private readonly mediaStorage: MediaStorage;
  private readonly logger: Logger;

  constructor(deps: EliminarServiceDeps) {
    this.services = deps.services;
    this.revalidateContent = deps.revalidateContent;
    this.mediaStorage = deps.mediaStorage;
    this.logger = deps.logger;
  }

  async execute(
    command: EliminarServiceCommand,
  ): Promise<{ service: { readonly id: string; readonly slug: string } }> {
    const { idOrSlug, requestId } = command;

    const resultado = await this.services.eliminar(idOrSlug);

    // Purgar derivados de las fotos del servicio eliminado
    await this.purgarFotos(resultado.service.fotos);

    await this.revalidateContent.revalidate('servicios');

    this.logger.info('service_deleted', { idOrSlug, requestId });

    return { service: { id: resultado.service.id, slug: resultado.service.slug } };
  }

  private async purgarFotos(fotos: readonly Foto[] | undefined): Promise<void> {
    const claves = this.clavesFotos(fotos);
    if (claves.length > 0) {
      await this.mediaStorage.deleteDerivados(claves, 'foto');
    }
  }

  private clavesFotos(fotos: readonly Foto[] | undefined): string[] {
    const claves: string[] = [];
    for (const foto of fotos ?? []) {
      for (const derivado of foto.derivados) {
        claves.push(derivado.clave);
      }
    }
    return claves;
  }
}
