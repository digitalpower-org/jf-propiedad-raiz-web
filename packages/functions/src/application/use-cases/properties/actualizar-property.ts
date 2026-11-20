import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { PropertiesRepository } from '../../ports/properties-repository';
import type { PropertyDto } from '../../ports/properties-repository';
import type { VideoValidator } from '../../ports/video-validator';
import type {
  ActualizarPropertyResult,
  ActualizarPropertyInputDto,
} from '../../ports/properties-repository';
import { RevalidateContent } from '../../revalidation/revalidate-content';
import type { TranslationService } from '../../translation/translation-service';
import { translatePropertyFields } from '../../translation/property-translations';

export interface ActualizarPropertyCommand {
  readonly idOrSlug: string;
  readonly input: ActualizarPropertyInputDto;
  readonly requestId?: string;
}

/**
 * US1.7 / US4.1 — Actualizar un inmueble (edición del admin).
 * Control de concurrencia optimista por `updatedAt` (409 si está desactualizado).
 * Traduce campos traducibles antes de guardar y dispara revalidación (US0.3).
 */
export class ActualizarPropertyUseCase implements UseCase<
  ActualizarPropertyCommand,
  ActualizarPropertyResult
> {
  constructor(
    private readonly properties: PropertiesRepository,
    private readonly revalidateContent: RevalidateContent,
    private readonly videoValidator: VideoValidator,
    private readonly logger: Logger,
    private readonly translationService: TranslationService,
  ) {}

  async execute(command: ActualizarPropertyCommand): Promise<ActualizarPropertyResult> {
    if (command.input.videos) {
      for (const videoUrl of command.input.videos) {
        await this.videoValidator.validate(videoUrl);
      }
    }

    let translatedInput = command.input;
    const encontrado = await this.properties.findByIdOrSlug(command.idOrSlug, false, true);
    if (encontrado) {
      const existing: PropertyDto = encontrado.property;
      translatedInput = await translatePropertyFields(
        command.input,
        existing,
        { translationService: this.translationService, logger: this.logger },
        command.requestId,
      );
    }

    const resultado = await this.properties.update(
      command.idOrSlug,
      translatedInput as ActualizarPropertyInputDto,
    );

    await this.revalidateContent.revalidate('propiedades');

    this.logger.info('property_updated', {
      idOrSlug: command.idOrSlug,
      requestId: command.requestId,
    });

    return resultado;
  }
}
