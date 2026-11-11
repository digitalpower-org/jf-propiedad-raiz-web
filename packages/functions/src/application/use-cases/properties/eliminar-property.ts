import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { PropertiesRepository } from '../../ports/properties-repository';
import type { EliminarPropertyResult } from '../../ports/properties-repository';
import { RevalidateContent } from '../../revalidation/revalidate-content';

export interface EliminarPropertyCommand {
  readonly idOrSlug: string;
}

/**
 * US1.7 / US4.1 — Soft delete de un inmueble (cambia a `DELETED`).
 * Nunca borrado físico. Tras la escritura se revalida (US0.3).
 */
export class EliminarPropertyUseCase
  implements UseCase<EliminarPropertyCommand, EliminarPropertyResult>
{
  constructor(
    private readonly properties: PropertiesRepository,
    private readonly revalidateContent: RevalidateContent,
    private readonly logger: Logger,
  ) {}

  async execute(command: EliminarPropertyCommand): Promise<EliminarPropertyResult> {
    const resultado = await this.properties.softDelete(command.idOrSlug);

    await this.revalidateContent.revalidate('propiedades');

    this.logger.info('property_deleted', { idOrSlug: command.idOrSlug });

    return resultado;
  }
}
