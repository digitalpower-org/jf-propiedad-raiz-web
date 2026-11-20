/**
 * Orchestrador de traducción para campos traducibles de inmuebles (US0.5).
 *
 * Recibe el DTO de entrada, el documento existente (opcional, solo para
 * actualización), el TranslationService y el requestId. Coordina la
 * traducción por lote de todos los campos traducibles presentes y fusiona
 * los resultados con mergeTranslatable.
 *
 * Campos traducibles: titulo, descripcion, acabados,
 * puntosInteres[<i>].etiqueta, proyecto.etapa.
 *
 * Reglas de decisión (task 1 / mergeTranslatable):
 * - es vacío → sin traducir, en vacío (AC0.5.3).
 *   en manual no vacío → persiste tal cual, sin traducir (AC0.5.4/AC0.5.12).
 * - autoTranslate inactivo → conserva en anterior, sin traducir (AC0.5.11).
 * - es no cambió y en previo relleno → no traducir (control de costo, AC0.5.2).
 * - autoTranslate activo y (es cambió o en previo vacío) → traducir (AC0.5.5).
 *
 * Se invoca translationService.translateContent a lo sumo una vez por comando
 * con todos los campos candidatos en un solo lote. Los resultados se mapean
 * por fieldPath y se fusionan campo a campo con mergeTranslatable.
 *
 * En caso de TranslateResult.hasErrors o callback que lanza, se registra
 * exactamente logger.error('translation_failed', error, { requestId, fieldPaths })
 * y los campos afectados quedan con en: '' / enPendiente: true.
 */

import type {
  CrearPropertyInputDto,
  ActualizarPropertyInputDto,
  PropertyDto,
  TranslatableInputDto,
} from '../ports/properties-repository';
import type { TranslationService } from './translation-service';
import type { Logger } from '../ports/logger';
import {
  mergeTranslatable,
  type TranslatableState,
} from '../../domain/properties/translatable-merge';

export interface TranslatableFieldResult extends TranslatableInputDto {
  readonly enPendiente?: boolean;
}

export interface PropertyTranslationsDeps {
  readonly translationService: TranslationService;
  readonly logger: Logger;
}

const EMPTY_STATE: TranslatableState = { es: '' };

function needsTranslation(input: TranslatableInputDto, existing: TranslatableState): boolean {
  const autoTranslate = input.autoTranslate ?? true;
  if (input.es === '') return false;
  if (input.en !== undefined && input.en !== '') return false;
  if (!autoTranslate) return false;
  const esChanged = existing.es !== input.es;
  return esChanged || !existing.en;
}

async function resolveField(
  fieldPath: string,
  input: TranslatableInputDto,
  existing: TranslatableState,
  outputsByFieldPath: Map<string, string>,
  failedFieldPaths: Set<string>,
): Promise<TranslatableFieldResult> {
  const autoTranslate = input.autoTranslate ?? true;
  const translate = async (_text: string): Promise<string> => {
    if (failedFieldPaths.has(fieldPath)) {
      throw new Error('translation_failed');
    }
    const translated = outputsByFieldPath.get(fieldPath);
    if (translated === undefined) {
      throw new Error('translation_failed');
    }
    return translated;
  };

  const result = await mergeTranslatable(existing, input, autoTranslate, translate);

  return {
    es: result.es,
    ...(result.en !== undefined ? { en: result.en } : {}),
    autoTranslate: result.autoTranslate,
    enPendiente: result.enPendiente,
  };
}

export async function translatePropertyFields(
  input: CrearPropertyInputDto | ActualizarPropertyInputDto,
  existing: PropertyDto | undefined,
  deps: PropertyTranslationsDeps,
  requestId?: string,
): Promise<CrearPropertyInputDto | ActualizarPropertyInputDto> {
  const { translationService, logger } = deps;

  // 1. Recopilar campos traducibles presentes con sus rutas de campo
  const candidates: {
    fieldPath: string;
    input: TranslatableInputDto;
    existing: TranslatableState;
  }[] = [];

  if (input.titulo) {
    candidates.push({
      fieldPath: 'titulo',
      input: input.titulo,
      existing: existing?.titulo ?? EMPTY_STATE,
    });
  }
  if (input.descripcion) {
    candidates.push({
      fieldPath: 'descripcion',
      input: input.descripcion,
      existing: existing?.descripcion ?? EMPTY_STATE,
    });
  }
  if (input.acabados) {
    candidates.push({
      fieldPath: 'acabados',
      input: input.acabados,
      existing: existing?.acabados ?? EMPTY_STATE,
    });
  }
  if (input.puntosInteres) {
    input.puntosInteres.forEach((punto, i) => {
      const etiqueta = punto.etiqueta;
      if (etiqueta) {
        candidates.push({
          fieldPath: `puntosInteres[${i}].etiqueta`,
          input: etiqueta,
          existing: existing?.puntosInteres?.[i]?.etiqueta ?? EMPTY_STATE,
        });
      }
    });
  }
  if (input.proyecto?.etapa) {
    candidates.push({
      fieldPath: 'proyecto.etapa',
      input: input.proyecto.etapa,
      existing: existing?.proyecto?.etapa ?? EMPTY_STATE,
    });
  }

  // 2. Decidir qué campos necesitan traducción (reglas de task 1)
  const toTranslate = candidates.filter((c) => needsTranslation(c.input, c.existing));

  // 3. Llamar a translateContent a lo sumo una vez con todos los candidatos en un lote
  const outputsByFieldPath = new Map<string, string>();
  const failedFieldPaths = new Set<string>();

  if (toTranslate.length > 0) {
    const translateInputs = toTranslate.map((c) => ({
      fieldPath: c.fieldPath,
      text: c.input.es,
    }));

    try {
      const result = await translationService.translateContent(translateInputs);

      if (result.hasErrors) {
        logger.error('translation_failed', result.error, {
          requestId,
          fieldPaths: toTranslate.map((c) => c.fieldPath),
        });
        toTranslate.forEach((c) => failedFieldPaths.add(c.fieldPath));
      } else {
        for (const output of result.outputs) {
          outputsByFieldPath.set(output.fieldPath, output.translated);
        }
      }
    } catch (error) {
      logger.error('translation_failed', error, {
        requestId,
        fieldPaths: toTranslate.map((c) => c.fieldPath),
      });
      toTranslate.forEach((c) => failedFieldPaths.add(c.fieldPath));
    }
  }

  // 4. Llamar a mergeTranslatable para cada campo translatable presente
  const titulo = input.titulo
    ? await resolveField(
        'titulo',
        input.titulo,
        existing?.titulo ?? EMPTY_STATE,
        outputsByFieldPath,
        failedFieldPaths,
      )
    : undefined;
  const descripcion = input.descripcion
    ? await resolveField(
        'descripcion',
        input.descripcion,
        existing?.descripcion ?? EMPTY_STATE,
        outputsByFieldPath,
        failedFieldPaths,
      )
    : undefined;
  const acabados = input.acabados
    ? await resolveField(
        'acabados',
        input.acabados,
        existing?.acabados ?? EMPTY_STATE,
        outputsByFieldPath,
        failedFieldPaths,
      )
    : undefined;

  const puntosInteres = input.puntosInteres
    ? await Promise.all(
        input.puntosInteres.map(async (punto, i) => {
          const etiqueta = punto.etiqueta;
          if (!etiqueta) return punto;
          const fieldPath = `puntosInteres[${i}].etiqueta`;
          const translatedEtiqueta = await resolveField(
            fieldPath,
            etiqueta,
            existing?.puntosInteres?.[i]?.etiqueta ?? EMPTY_STATE,
            outputsByFieldPath,
            failedFieldPaths,
          );
          return { ...punto, etiqueta: translatedEtiqueta };
        }),
      )
    : undefined;

  const proyecto = input.proyecto
    ? {
        ...input.proyecto,
        ...(input.proyecto.etapa !== undefined
          ? {
              etapa: await resolveField(
                'proyecto.etapa',
                input.proyecto.etapa,
                existing?.proyecto?.etapa ?? EMPTY_STATE,
                outputsByFieldPath,
                failedFieldPaths,
              ),
            }
          : {}),
      }
    : undefined;

  // 5. Retornar nuevo input DTO con valores fusionados usando spreads condicionales
  return {
    ...input,
    ...(titulo !== undefined ? { titulo } : {}),
    ...(descripcion !== undefined ? { descripcion } : {}),
    ...(acabados !== undefined ? { acabados } : {}),
    ...(puntosInteres !== undefined ? { puntosInteres } : {}),
    ...(proyecto !== undefined ? { proyecto } : {}),
  };
}
