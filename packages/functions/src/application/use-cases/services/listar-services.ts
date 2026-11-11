// Use case US6.2 — Listado público de servicios.
// Solo devuelve servicios `ACTIVE`, ordenados por `orden`.

import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { ServiciosRepository, ListarServicesResult } from '../../ports/services-repository';

export class ListarServicesUseCase implements UseCase<void, ListarServicesResult> {
  constructor(
    private readonly services: ServiciosRepository,
    private readonly logger: Logger,
  ) {}

  async execute(): Promise<ListarServicesResult> {
    const resultado = await this.services.listar();

    this.logger.debug('services_listed', { items: resultado.items.length });

    return resultado;
  }
}
