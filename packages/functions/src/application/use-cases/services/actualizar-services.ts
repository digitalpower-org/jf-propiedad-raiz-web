// US4.4.2 — Actualizar un servicio (edición del admin).
// Valida unicidad de slug excluyendo self, traduce campos traducibles,
// purga derivados de fotos removidas o reemplazadas y revalida 'servicios'.

import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type {
  ServiciosRepository,
  ActualizarServiceInputDto,
  ActualizarServiceResult,
} from '../../ports/services-repository';
import type { Foto } from '@jf/shared-types';
import type { MediaStorage } from '../../ports/media-storage';
import { RevalidateContent } from '../../revalidation/revalidate-content';
import type { TranslationService } from '../../translation/translation-service';
import { translateContentFields } from '../../translation/content-translations';
import type { ContentTranslatedField } from '../../translation/content-translations';
import { ApiError } from '../../../domain/errors/api-error';
import { errorCode } from '../../../domain/errors/errorCatalog';
import { slugDesdeTitulo } from './service-slug';

export interface ActualizarServiceCommand {
  readonly idOrSlug: string;
  readonly input: ActualizarServiceInputDto;
  readonly requestId?: string;
}

export interface ActualizarServiceDeps {
  readonly services: ServiciosRepository;
  readonly revalidateContent: RevalidateContent;
  readonly mediaStorage: MediaStorage;
  readonly translationService: TranslationService;
  readonly logger: Logger;
}

export class ActualizarServiceUseCase implements UseCase<
  ActualizarServiceCommand,
  ActualizarServiceResult
> {
  private readonly services: ServiciosRepository;
  private readonly revalidateContent: RevalidateContent;
  private readonly mediaStorage: MediaStorage;
  private readonly translationService: TranslationService;
  private readonly logger: Logger;

  constructor(deps: ActualizarServiceDeps) {
    this.services = deps.services;
    this.revalidateContent = deps.revalidateContent;
    this.mediaStorage = deps.mediaStorage;
    this.translationService = deps.translationService;
    this.logger = deps.logger;
  }

  async execute(command: ActualizarServiceCommand): Promise<ActualizarServiceResult> {
    const { idOrSlug, input, requestId } = command;

    // Obtener servicio actual para validar existencia y comparar fotos
    const existente = await this.services.obtenerPorIdOSlug(idOrSlug, false);
    if (!existente) {
      throw new ApiError(errorCode.serviceNotFound, `Servicio no encontrado: ${idOrSlug}`);
    }

    // Validar unicidad del slug cuando el título cambia (excluyendo self)
    if (input.titulo) {
      const slug = slugDesdeTitulo(input.titulo.es);
      const otro = await this.services.obtenerPorIdOSlug(slug, false);
      if (otro && otro.service.id !== existente.service.id) {
        throw new ApiError(errorCode.validationError, 'El slug ya está en uso', [
          { field: 'slug', issue: 'ya está en uso' },
        ]);
      }
    }

    // Construir candidatos de traducción solo para campos provistos
    const candidatos = this.buildCandidates(input, existente.service);
    const traducidos = await translateContentFields(
      candidatos,
      {
        translationService: this.translationService,
        logger: this.logger,
      },
      requestId,
    );

    // Aplicar traducciones al input de forma inmutable
    const inputTraducido = this.applyTranslations(input, traducidos);

    // Purgar derivados de fotos removidas o reemplazadas
    await this.purgarFotos(existente.service.fotos, inputTraducido.fotos);

    const resultado = await this.services.actualizar(idOrSlug, inputTraducido);

    await this.revalidateContent.revalidate('servicios');

    this.logger.info('service_updated', { idOrSlug, requestId });

    return resultado;
  }

  private buildCandidates(
    input: ActualizarServiceInputDto,
    existing: {
      readonly titulo: {
        readonly es: string;
        readonly en?: string;
        readonly autoTranslate?: boolean;
        readonly enPendiente?: boolean;
      };
      readonly resumen: {
        readonly es: string;
        readonly en?: string;
        readonly autoTranslate?: boolean;
        readonly enPendiente?: boolean;
      };
      readonly cuerpo: {
        readonly es: string;
        readonly en?: string;
        readonly autoTranslate?: boolean;
        readonly enPendiente?: boolean;
      };
    },
  ): {
    readonly fieldPath: string;
    readonly input: { readonly es: string; readonly en?: string; readonly autoTranslate?: boolean };
    readonly existing: {
      readonly es: string;
      readonly en?: string;
      readonly autoTranslate?: boolean;
      readonly enPendiente?: boolean;
    };
  }[] {
    const candidatos: {
      readonly fieldPath: string;
      readonly input: {
        readonly es: string;
        readonly en?: string;
        readonly autoTranslate?: boolean;
      };
      readonly existing: {
        readonly es: string;
        readonly en?: string;
        readonly autoTranslate?: boolean;
        readonly enPendiente?: boolean;
      };
    }[] = [];

    if (input.titulo) {
      candidatos.push({ fieldPath: 'titulo', input: input.titulo, existing: existing.titulo });
    }
    if (input.resumen) {
      candidatos.push({ fieldPath: 'resumen', input: input.resumen, existing: existing.resumen });
    }
    if (input.cuerpo) {
      candidatos.push({ fieldPath: 'cuerpo', input: input.cuerpo, existing: existing.cuerpo });
    }

    return candidatos;
  }

  private applyTranslations(
    input: ActualizarServiceInputDto,
    traducidos: ReadonlyMap<string, ContentTranslatedField>,
  ): ActualizarServiceInputDto {
    const get = (fieldPath: string): ContentTranslatedField | undefined =>
      traducidos.get(fieldPath);

    return {
      ...input,
      ...(input.titulo ? { titulo: toTranslatableInput(get('titulo'), input.titulo) } : {}),
      ...(input.resumen ? { resumen: toTranslatableInput(get('resumen'), input.resumen) } : {}),
      ...(input.cuerpo ? { cuerpo: toTranslatableInput(get('cuerpo'), input.cuerpo) } : {}),
    };
  }

  private async purgarFotos(
    viejas: readonly Foto[] | undefined,
    nuevas: readonly Foto[] | undefined,
  ): Promise<void> {
    const clavesVieja = new Set(this.clavesFotos(viejas));
    const clavesNueva = new Set(this.clavesFotos(nuevas));
    const clavesAPurgar = [...clavesVieja].filter((clave) => !clavesNueva.has(clave));
    if (clavesAPurgar.length > 0) {
      await this.mediaStorage.deleteDerivados(clavesAPurgar, 'foto');
    }
  }

  private clavesFotos(fotos: readonly Foto[] | undefined): string[] {
    const claves: string[] = [];
    for (const foto of fotos ?? []) {
      for (const derivado of foto.derivados) {
        claves.push(derivado.clave);
      }
    }
    return claves;
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
