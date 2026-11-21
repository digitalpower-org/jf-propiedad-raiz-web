// US4.4.4 — Obtener un servicio por id o slug.
// Desde la web pública, un servicio `HIDDEN` o `DELETED` responde 404 `SERVICE_NOT_FOUND`.
// `includeHidden=true` (con sesión de admin válida) permite ver servicios `HIDDEN`.

import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { ServiciosRepository, ObtenerPorIdOSlugResult } from '../../ports/services-repository';
import { ApiError } from '../../../domain/errors/api-error';
import { errorCode } from '../../../domain/errors/errorCatalog';

export interface ObtenerServiceCommand {
  readonly idOrSlug: string;
  readonly esPublico?: boolean;
  readonly includeHidden?: boolean;
}

export class ObtenerServiceUseCase implements UseCase<
  ObtenerServiceCommand,
  ObtenerPorIdOSlugResult
> {
  private readonly services: ServiciosRepository;
  private readonly logger: Logger;

  constructor(services: ServiciosRepository, logger: Logger) {
    this.services = services;
    this.logger = logger;
  }

  async execute(command: ObtenerServiceCommand): Promise<ObtenerPorIdOSlugResult> {
    const resultado = await this.services.obtenerPorIdOSlug(
      command.idOrSlug,
      command.esPublico ?? false,
      command.includeHidden,
    );

    if (!resultado) {
      throw new ApiError(errorCode.serviceNotFound, `Servicio no encontrado: ${command.idOrSlug}`);
    }

    this.logger.debug('service_obtained', { idOrSlug: command.idOrSlug });

    return resultado;
  }
}
