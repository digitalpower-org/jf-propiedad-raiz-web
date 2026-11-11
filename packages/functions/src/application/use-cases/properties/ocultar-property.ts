import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { PropertiesRepository } from '../../ports/properties-repository';
import type { OcultarPropertyResult } from '../../ports/properties-repository';
import { RevalidateContent } from '../../revalidation/revalidate-content';

export interface OcultarPropertyCommand {
  readonly idOrSlug: string;
}

/**
 * US1.7 / US4.1 — Ocultar un inmueble (ACTIVE → HIDDEN).
 * No cambia `fechaPublicacion` (AC1.7.5). Tras guardar se revalida (US0.3).
 */
export class OcultarPropertyUseCase implements UseCase<
  OcultarPropertyCommand,
  OcultarPropertyResult
> {
  constructor(
    private readonly properties: PropertiesRepository,
    private readonly revalidateContent: RevalidateContent,
    private readonly logger: Logger,
  ) {}

  async execute(command: OcultarPropertyCommand): Promise<OcultarPropertyResult> {
    const resultado = await this.properties.hide(command.idOrSlug);

    await this.revalidateContent.revalidate('propiedades');

    this.logger.info('property_hidden', { idOrSlug: command.idOrSlug });

    return resultado;
  }
}
