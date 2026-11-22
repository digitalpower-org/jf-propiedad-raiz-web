// Use case US6.2 — Listado público paginado de servicios.
// Por defecto solo devuelve `ACTIVE`; con `includeHidden` incluye `HIDDEN`.

import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { ServiciosRepository, ListarPaginadoResult } from '../../ports/services-repository';

export interface ListarServicesCommand {
  readonly cursor?: string;
  readonly limit?: number;
  readonly includeHidden?: boolean;
}

export class ListarServicesUseCase implements UseCase<ListarServicesCommand, ListarPaginadoResult> {
  constructor(
    private readonly services: ServiciosRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: ListarServicesCommand): Promise<ListarPaginadoResult> {
    const resultado = await this.services.listarPaginado(command);

    this.logger.debug('services_listed', { items: resultado.items.length });

    return resultado;
  }
}
