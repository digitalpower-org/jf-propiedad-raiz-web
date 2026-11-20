import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { PropertiesRepository } from '../../ports/properties-repository';
import type { VideoValidator } from '../../ports/video-validator';
import type { CrearPropertyResult, CrearPropertyInputDto } from '../../ports/properties-repository';
import { RevalidateContent } from '../../revalidation/revalidate-content';
import type { TranslationService } from '../../translation/translation-service';
import { translatePropertyFields } from '../../translation/property-translations';

export interface CrearPropertyCommand {
  readonly input: CrearPropertyInputDto;
  readonly requestId?: string;
}

/**
 * US1.7 — Crear un inmueble en estado `HIDDEN` con código secuencial `JF-XXXX`.
 * Traduce los campos traducibles antes de escribir y dispara la revalidación (US0.3).
 */
export class CrearPropertyUseCase implements UseCase<CrearPropertyCommand, CrearPropertyResult> {
  constructor(
    private readonly properties: PropertiesRepository,
    private readonly revalidateContent: RevalidateContent,
    private readonly videoValidator: VideoValidator,
    private readonly logger: Logger,
    private readonly translationService: TranslationService,
  ) {}

  async execute(command: CrearPropertyCommand): Promise<CrearPropertyResult> {
    if (command.input.videos) {
      for (const videoUrl of command.input.videos) {
        await this.videoValidator.validate(videoUrl);
      }
    }

    const translatedInput = await translatePropertyFields(
      command.input,
      undefined,
      { translationService: this.translationService, logger: this.logger },
      command.requestId,
    );

    const resultado = await this.properties.create(translatedInput as CrearPropertyInputDto);

    await this.revalidateContent.revalidate('propiedades');

    this.logger.info('property_created', {
      codigo: resultado.property.codigo,
      requestId: command.requestId,
    });

    return resultado;
  }
}
