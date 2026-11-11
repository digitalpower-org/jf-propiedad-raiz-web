import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { PropertiesRepository } from '../../ports/properties-repository';
import type {
  FiltrosListadoPublico,
  ListadoPublicoResult,
} from '../../ports/properties-repository';

/**
 * US1.10 — Listado público de inmuebles con filtros y paginación por cursor.
 * Solo devuelve inmuebles `ACTIVE`.
 */
export class ListarPropertiesUseCase
  implements UseCase<FiltrosListadoPublico, ListadoPublicoResult>
{
  constructor(
    private readonly properties: PropertiesRepository,
    private readonly logger: Logger,
  ) {}

  async execute(filtros: FiltrosListadoPublico): Promise<ListadoPublicoResult> {
    const resultado = await this.properties.listPublico(filtros);

    this.logger.debug('properties_listed', {
      operacion: filtros.operacion,
      destacada: filtros.destacada,
      items: resultado.items.length,
    });

    return resultado;
  }
}
