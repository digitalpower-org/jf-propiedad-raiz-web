import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { PropertiesRepository } from '../../ports/properties-repository';
import type { ActivarPropertyResult } from '../../ports/properties-repository';
import { RevalidateContent } from '../../revalidation/revalidate-content';
import { validatePropertyCompleteness } from '../../validators/property-completeness';
import { errorCode } from '../../../domain/errors/errorCatalog';
import { ApiError } from '../../../domain/errors/api-error';
import { errPropertyNotFound } from '../../../domain/errors/error-messages';

export interface ActivarPropertyCommand {
  readonly idOrSlug: string;
}

/**
 * US1.7 / US4.1 — Activar un inmueble (HIDDEN → ACTIVE).
 * Valida campos obligatorios para activar (AC1.7.3) y precio > 0 (AC1.7.4).
 * La primera activación fija `fechaPublicacion` (AC1.7.5). Tras guardar se revalida (US0.3).
 * DELETED nunca se reactiva. Incompleto responde 422 con details.
 */
export class ActivarPropertyUseCase implements UseCase<
  ActivarPropertyCommand,
  ActivarPropertyResult
> {
  constructor(
    private readonly properties: PropertiesRepository,
    private readonly revalidateContent: RevalidateContent,
    private readonly logger: Logger,
  ) {}

  async execute(command: ActivarPropertyCommand): Promise<ActivarPropertyResult> {
    // Primero obtener la propiedad para validar completitud
    const encontrado = await this.properties.findByIdOrSlug(command.idOrSlug, false, true);
    if (!encontrado) {
      throw new ApiError(errorCode.propertyNotFound, errPropertyNotFound(command.idOrSlug));
    }

    const property = encontrado.property;

    // DELETED nunca se reactiva
    if (property.status === 'DELETED') {
      throw new ApiError(errorCode.conflict, 'El inmueble está eliminado y no puede activarse');
    }

    // Validar completitud
    const completeness = validatePropertyCompleteness(property);
    if (!completeness.isComplete) {
      throw new ApiError(
        errorCode.validationError,
        'Campos obligatorios para activar',
        completeness.missingFields,
      );
    }

    const resultado = await this.properties.activate(command.idOrSlug);

    await this.revalidateContent.revalidate('propiedades');

    this.logger.info('property_activated', {
      idOrSlug: command.idOrSlug,
      primeraActivacion: resultado.primeraActivacion,
    });

    return resultado;
  }
}
