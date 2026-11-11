import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { PropertiesRepository, PropertyCardDto } from '../../ports/properties-repository';

/**
 * US1.11 — Listado de propiedades destacadas para la página de inicio.
 * Solo devuelve inmuebles `ACTIVE` con `destacada == true`.
 */
export class ListarFeaturedPropertiesUseCase implements UseCase<void, readonly PropertyCardDto[]> {
  constructor(
    private readonly properties: PropertiesRepository,
    private readonly logger: Logger,
  ) {}

  async execute(): Promise<readonly PropertyCardDto[]> {
    const resultado = await this.properties.getFeatured();

    this.logger.debug('featured_properties_listed', { items: resultado.length });

    return resultado;
  }
}
