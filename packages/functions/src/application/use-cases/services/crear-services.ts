// US4.4.1 — Crear un servicio en estado `HIDDEN` con slug único.
// Traduce los campos traducibles antes de escribir y dispara la revalidación (US0.3).

import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type {
  ServiciosRepository,
  CrearServiceInputDto,
  CrearServiceResult,
} from '../../ports/services-repository';
import type { MediaStorage } from '../../ports/media-storage';
import { RevalidateContent } from '../../revalidation/revalidate-content';
import type { TranslationService } from '../../translation/translation-service';
import { translateContentFields } from '../../translation/content-translations';
import type { ContentTranslatedField } from '../../translation/content-translations';
import { ApiError } from '../../../domain/errors/api-error';
import { errorCode } from '../../../domain/errors/errorCatalog';
import { slugDesdeTitulo } from './service-slug';

export interface CrearServiceCommand {
  readonly input: CrearServiceInputDto;
  readonly requestId?: string;
}

export interface CrearServiceDeps {
  readonly services: ServiciosRepository;
  readonly revalidateContent: RevalidateContent;
  readonly mediaStorage: MediaStorage;
  readonly translationService: TranslationService;
  readonly logger: Logger;
}

export class CrearServiceUseCase implements UseCase<CrearServiceCommand, CrearServiceResult> {
  private readonly services: ServiciosRepository;
  private readonly revalidateContent: RevalidateContent;
  private readonly translationService: TranslationService;
  private readonly logger: Logger;

  constructor(deps: CrearServiceDeps) {
    this.services = deps.services;
    this.revalidateContent = deps.revalidateContent;
    this.translationService = deps.translationService;
    this.logger = deps.logger;
  }

  async execute(command: CrearServiceCommand): Promise<CrearServiceResult> {
    const { input, requestId } = command;

    // Validar unicidad del slug derivado del título en español
    const slug = slugDesdeTitulo(input.titulo.es);
    const existente = await this.services.obtenerPorIdOSlug(slug, false);
    if (existente) {
      throw new ApiError(errorCode.validationError, 'El slug ya está en uso', [
        { field: 'slug', issue: 'ya está en uso' },
      ]);
    }

    // Traducir campos traducibles (titulo, resumen, cuerpo)
    const candidatos = [
      { fieldPath: 'titulo', input: input.titulo, existing: { es: '' } },
      { fieldPath: 'resumen', input: input.resumen, existing: { es: '' } },
      { fieldPath: 'cuerpo', input: input.cuerpo, existing: { es: '' } },
    ];
    const traducidos = await translateContentFields(
      candidatos,
      {
        translationService: this.translationService,
        logger: this.logger,
      },
      requestId,
    );

    const inputTraducido: CrearServiceInputDto = {
      ...input,
      titulo: toTranslatableInput(traducidos.get('titulo'), input.titulo),
      resumen: toTranslatableInput(traducidos.get('resumen'), input.resumen),
      cuerpo: toTranslatableInput(traducidos.get('cuerpo'), input.cuerpo),
    };

    const resultado = await this.services.crear(inputTraducido);

    await this.revalidateContent.revalidate('servicios');

    this.logger.info('service_created', { id: resultado.service.id, slug, requestId });

    return resultado;
  }
}

function toTranslatableInput(
  field: ContentTranslatedField | undefined,
  fallback: { readonly es: string; readonly en?: string; readonly autoTranslate?: boolean },
): { readonly es: string; readonly en?: string; readonly autoTranslate?: boolean } {
  if (!field) return fallback;
  return {
    es: field.es,
    ...(field.en !== undefined ? { en: field.en } : {}),
    ...(field.autoTranslate !== undefined ? { autoTranslate: field.autoTranslate } : {}),
  };
}
