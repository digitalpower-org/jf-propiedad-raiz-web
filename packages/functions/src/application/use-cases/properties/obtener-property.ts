import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { PropertiesRepository } from '../../ports/properties-repository';
import type { ObtenerPropertyResult } from '../../ports/properties-repository';
import { ApiError } from '../../../domain/errors/api-error';

export interface ObtenerPropertyCommand {
  readonly idOrSlug: string;
  readonly esPublico: boolean;
}

/**
 * US1.7 / US2.4 — Obtener un inmueble por id o slug.
 * Desde la web pública, una ficha `HIDDEN` o `DELETED` responde 404 `PROPERTY_NOT_FOUND` (AC1.7.7).
 */
export class ObtenerPropertyUseCase
  implements UseCase<ObtenerPropertyCommand, ObtenerPropertyResult>
{
  constructor(
    private readonly properties: PropertiesRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: ObtenerPropertyCommand): Promise<ObtenerPropertyResult> {
    const resultado = await this.properties.findByIdOrSlug(
      command.idOrSlug,
      command.esPublico,
    );

    if (resultado === null) {
      throw new ApiError(
        'PROPERTY_NOT_FOUND',
        `Inmueble no encontrado: ${command.idOrSlug}`,
      );
    }

    this.logger.debug('property_obtained', { idOrSlug: command.idOrSlug });

    return resultado;
  }
}
