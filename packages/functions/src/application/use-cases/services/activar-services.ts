// US4.4.4 — Activar un servicio (HIDDEN → ACTIVE).
// Tras la escritura se revalida 'servicios' (US0.3).

import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { ServiciosRepository } from '../../ports/services-repository';
import type { MediaStorage } from '../../ports/media-storage';
import { RevalidateContent } from '../../revalidation/revalidate-content';

export interface ActivarServiceCommand {
  readonly idOrSlug: string;
  readonly requestId?: string;
}

export interface ActivarServiceDeps {
  readonly services: ServiciosRepository;
  readonly revalidateContent: RevalidateContent;
  readonly mediaStorage: MediaStorage;
  readonly logger: Logger;
}

export class ActivarServiceUseCase implements UseCase<
  ActivarServiceCommand,
  { service: { readonly id: string } }
> {
  private readonly services: ServiciosRepository;
  private readonly revalidateContent: RevalidateContent;
  private readonly logger: Logger;

  constructor(deps: ActivarServiceDeps) {
    this.services = deps.services;
    this.revalidateContent = deps.revalidateContent;
    this.logger = deps.logger;
  }

  async execute(command: ActivarServiceCommand): Promise<{ service: { readonly id: string } }> {
    const { idOrSlug, requestId } = command;

    const resultado = await this.services.activar(idOrSlug);

    await this.revalidateContent.revalidate('servicios');

    this.logger.info('service_activated', { idOrSlug, requestId });

    return { service: { id: resultado.service.id } };
  }
}
