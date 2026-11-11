import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { PropertiesRepository } from '../../ports/properties-repository';
import type { CrearPropertyResult, CrearPropertyInputDto } from '../../ports/properties-repository';
import { RevalidateContent } from '../../revalidation/revalidate-content';

export interface CrearPropertyCommand {
  readonly input: CrearPropertyInputDto;
}

/**
 * US1.7 — Crear un inmueble en estado `HIDDEN` con código secuencial `JF-XXXX`.
 * Tras la escritura dispara la revalidación (US0.3).
 */
export class CrearPropertyUseCase implements UseCase<CrearPropertyCommand, CrearPropertyResult> {
  constructor(
    private readonly properties: PropertiesRepository,
    private readonly revalidateContent: RevalidateContent,
    private readonly logger: Logger,
  ) {}

  async execute(command: CrearPropertyCommand): Promise<CrearPropertyResult> {
    const resultado = await this.properties.create(command.input);

    await this.revalidateContent.revalidate('propiedades');

    this.logger.info('property_created', { codigo: resultado.property.codigo });

    return resultado;
  }
}
