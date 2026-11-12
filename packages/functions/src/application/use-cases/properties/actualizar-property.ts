import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { PropertiesRepository } from '../../ports/properties-repository';
import type {
  ActualizarPropertyResult,
  ActualizarPropertyInputDto,
} from '../../ports/properties-repository';
import { RevalidateContent } from '../../revalidation/revalidate-content';

export interface ActualizarPropertyCommand {
  readonly idOrSlug: string;
  readonly input: ActualizarPropertyInputDto;
}

/**
 * US1.7 / US4.1 — Actualizar un inmueble (edición del admin).
 * Control de concurrencia optimista por `updatedAt` (409 si está desactualizado).
 * Tras guardar, se traducen campos con `autoTranslate` y se dispara revalidación (US0.3).
 */
export class ActualizarPropertyUseCase implements UseCase<
  ActualizarPropertyCommand,
  ActualizarPropertyResult
> {
  constructor(
    private readonly properties: PropertiesRepository,
    private readonly revalidateContent: RevalidateContent,
    private readonly logger: Logger,
  ) {}

  async execute(command: ActualizarPropertyCommand): Promise<ActualizarPropertyResult> {
    const resultado = await this.properties.update(command.idOrSlug, command.input);

    await this.revalidateContent.revalidate('propiedades');

    this.logger.info('property_updated', { idOrSlug: command.idOrSlug });

    return resultado;
  }
}
