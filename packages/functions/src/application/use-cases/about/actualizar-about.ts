// US6.4 — Actualizar documento Nosotros (edición del admin).
// Valida extracto.es ≤ 500, traduce campos traducibles, purga derivados de foto
// removidos/reemplazados, guarda con control de concurrencia y revalida 'nosotros'.

import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { AboutRepository, AboutDto, AboutDtoInput } from '../../ports/about-repository';
import type { RevalidateContent } from '../../revalidation/revalidate-content';
import type { MediaStorage } from '../../ports/media-storage';
import type { TranslationService } from '../../translation/translation-service';
import type { ContentTranslatedField } from '../../translation/content-translations';
import { translateContentFields } from '../../translation/content-translations';
import { ApiError } from '../../../domain/errors/api-error';
import { errorCode } from '../../../domain/errors/errorCatalog';

export interface ActualizarAboutCommand {
  readonly input: AboutDtoInput;
  readonly expectedUpdatedAt?: string;
  readonly requestId?: string;
}

export interface ActualizarAboutDeps {
  readonly about: AboutRepository;
  readonly revalidateContent: RevalidateContent;
  readonly mediaStorage: MediaStorage;
  readonly translationService: TranslationService;
  readonly logger: Logger;
}

export class ActualizarAboutUseCase implements UseCase<ActualizarAboutCommand, AboutDto> {
  private readonly about: AboutRepository;
  private readonly revalidateContent: RevalidateContent;
  private readonly mediaStorage: MediaStorage;
  private readonly translationService: TranslationService;
  private readonly logger: Logger;

  constructor(deps: ActualizarAboutDeps) {
    this.about = deps.about;
    this.revalidateContent = deps.revalidateContent;
    this.mediaStorage = deps.mediaStorage;
    this.translationService = deps.translationService;
    this.logger = deps.logger;
  }

  async execute(command: ActualizarAboutCommand): Promise<AboutDto> {
    const { input, expectedUpdatedAt, requestId } = command;

    // Validación: extracto.es ≤ 500 caracteres
    if (input.extracto.es.length > 500) {
      throw new ApiError(errorCode.validationError, 'El extracto no puede exceder 500 caracteres');
    }

    // Obtener documento actual para comparar fotos antes de guardar
    const actual = await this.about.obtener();

    // Si el cliente no envía versión, se resuelve en servidor desde el documento actual
    const versionEsperada = expectedUpdatedAt ?? actual?.updatedAt ?? '';

    // Construir candidatos y traducir campos traducibles
    const candidatos = this.buildCandidates(input, actual);
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
    await this.purgarFotos(actual, inputTraducido);

    // Guardar (propaga CONFLICT si la versión esperada está desactualizada)
    const resultado = await this.about.guardar(inputTraducido, versionEsperada);

    // Revalidar contenido tras escritura exitosa
    await this.revalidateContent.revalidate('nosotros');

    return resultado;
  }

  private buildCandidates(
    input: AboutDtoInput,
    actual: AboutDto | null,
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

    candidatos.push({
      fieldPath: 'titulo',
      input: input.titulo,
      existing: actual?.titulo ?? { es: '' },
    });

    candidatos.push({
      fieldPath: 'extracto',
      input: input.extracto,
      existing: actual?.extracto ?? { es: '' },
    });

    input.secciones.forEach((seccion, i) => {
      candidatos.push({
        fieldPath: `secciones[${i}].titulo`,
        input: seccion.titulo,
        existing: actual?.secciones?.[i]?.titulo ?? { es: '' },
      });
      candidatos.push({
        fieldPath: `secciones[${i}].cuerpo`,
        input: seccion.cuerpo,
        existing: actual?.secciones?.[i]?.cuerpo ?? { es: '' },
      });
    });

    input.equipo.forEach((integrante, i) => {
      candidatos.push({
        fieldPath: `equipo[${i}].cargo`,
        input: integrante.cargo,
        existing: actual?.equipo?.[i]?.cargo ?? { es: '' },
      });
      if (integrante.descripcion) {
        candidatos.push({
          fieldPath: `equipo[${i}].descripcion`,
          input: integrante.descripcion,
          existing: actual?.equipo?.[i]?.descripcion ?? { es: '' },
        });
      }
    });

    return candidatos;
  }

  private applyTranslations(
    input: AboutDtoInput,
    traducidos: ReadonlyMap<string, ContentTranslatedField>,
  ): AboutDtoInput {
    const get = (fieldPath: string): ContentTranslatedField | undefined =>
      traducidos.get(fieldPath);

    const titulo = this.toTranslatableInput(get('titulo'), input.titulo);
    const extracto = this.toTranslatableInput(get('extracto'), input.extracto);

    const secciones = input.secciones.map((seccion, i) => ({
      ...seccion,
      titulo: this.toTranslatableInput(get(`secciones[${i}].titulo`), seccion.titulo),
      cuerpo: this.toTranslatableInput(get(`secciones[${i}].cuerpo`), seccion.cuerpo),
    }));

    const equipo = input.equipo.map((integrante, i) => ({
      ...integrante,
      cargo: this.toTranslatableInput(get(`equipo[${i}].cargo`), integrante.cargo),
      ...(integrante.descripcion !== undefined
        ? {
            descripcion: this.toTranslatableInput(
              get(`equipo[${i}].descripcion`),
              integrante.descripcion,
            ),
          }
        : {}),
    }));

    return {
      ...input,
      titulo,
      extracto,
      secciones,
      equipo,
    };
  }

  private toTranslatableInput(
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

  private async purgarFotos(actual: AboutDto | null, input: AboutDtoInput): Promise<void> {
    const equipoActual = actual?.equipo ?? [];
    const clavesAPurgar: string[] = [];

    for (let i = 0; i < equipoActual.length; i++) {
      const viejoFoto = equipoActual[i].foto;
      const nuevoIntegrante = input.equipo[i];
      const nuevoFoto = nuevoIntegrante?.foto;
      if (viejoFoto !== undefined && viejoFoto !== nuevoFoto) {
        clavesAPurgar.push(viejoFoto);
      }
    }

    for (const clave of clavesAPurgar) {
      await this.mediaStorage.deleteDerivados([clave], 'foto');
    }
  }
}
