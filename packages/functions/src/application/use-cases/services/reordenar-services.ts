// US4.4.3 — Reordenar servicios (persiste `orden`).
// Usa WriteBatch atómico en el repositorio y revalida 'servicios' (US0.3).

import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { ServiciosRepository } from '../../ports/services-repository';
import type { MediaStorage } from '../../ports/media-storage';
import { RevalidateContent } from '../../revalidation/revalidate-content';

export interface ReordenarServiceCommand {
  readonly items: readonly { id: string; orden: number }[];
  readonly requestId?: string;
}

export interface ReordenarServiceDeps {
  readonly services: ServiciosRepository;
  readonly revalidateContent: RevalidateContent;
  readonly mediaStorage: MediaStorage;
  readonly logger: Logger;
}

export class ReordenarServiceUseCase implements UseCase<ReordenarServiceCommand, void> {
  private readonly services: ServiciosRepository;
  private readonly revalidateContent: RevalidateContent;
  private readonly logger: Logger;

  constructor(deps: ReordenarServiceDeps) {
    this.services = deps.services;
    this.revalidateContent = deps.revalidateContent;
    this.logger = deps.logger;
  }

  async execute(command: ReordenarServiceCommand): Promise<void> {
    const { items, requestId } = command;

    await this.services.reordenar(items);

    await this.revalidateContent.revalidate('servicios');

    this.logger.info('service_reordered', { items: items.length, requestId });
  }
}
