import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { PropertiesRepository } from '../../ports/properties-repository';
import type { ActivarPropertyResult } from '../../ports/properties-repository';
import { RevalidateContent } from '../../revalidation/revalidate-content';

export interface ActivarPropertyCommand {
  readonly idOrSlug: string;
}

/**
 * US1.7 / US4.1 — Activar un inmueble (HIDDEN → ACTIVE).
 * Valida campos obligatorios para activar (AC1.7.3) y precio > 0 (AC1.7.4).
 * La primera activación fija `fechaPublicacion` (AC1.7.5). Tras guardar se revalida (US0.3).
 */
export class ActivarPropertyUseCase
  implements UseCase<ActivarPropertyCommand, ActivarPropertyResult>
{
  constructor(
    private readonly properties: PropertiesRepository,
    private readonly revalidateContent: RevalidateContent,
    private readonly logger: Logger,
  ) {}

  async execute(command: ActivarPropertyCommand): Promise<ActivarPropertyResult> {
    const resultado = await this.properties.activate(command.idOrSlug);

    await this.revalidateContent.revalidate('propiedades');

    this.logger.info('property_activated', {
      idOrSlug: command.idOrSlug,
      primeraActivacion: resultado.primeraActivacion,
    });

    return resultado;
  }
}
