/**
 * Orchestrador de traducción para campos traducibles de contenido CMS (About, Servicios).
 *
 * Recibe candidatos con ruta de campo, entrada y estado existente, decide cuáles
 * necesitan traducción aplicando las mismas reglas que property-translations.ts,
 * invoca translationService.translateContent a lo sumo una vez en lote, y fusiona
 * los resultados con mergeTranslatable.
 *
 * Reglas de decisión:
 * - es vacío → sin traducir (en vacío, enPendiente=false).
 * - en manual no vacío → persiste tal cual, sin traducir.
 * - autoTranslate inactivo → conserva en anterior, enPendiente=true.
 * - es no cambió y en previo relleno → no traducir (control de costo).
 * - autoTranslate activo y (es cambió o en previo vacío) → traducir.
 *
 * En caso de TranslateResult.hasErrors o callback que lanza, se registra
 * exactamente logger.error('translation_failed', error, { requestId, fieldPaths })
 * y los campos afectados quedan con en: '' / enPendiente: true.
 */

import type { TranslationService } from './translation-service';
import type { Logger } from '../ports/logger';
import { mergeTranslatable } from '../../domain/properties/translatable-merge';

export interface ContentTranslatableInput {
  readonly es: string;
  readonly en?: string;
  readonly autoTranslate?: boolean;
}

export interface ContentTranslatableState {
  readonly es: string;
  readonly en?: string;
  readonly autoTranslate?: boolean;
  readonly enPendiente?: boolean;
}

export interface ContentTranslationCandidate {
  readonly fieldPath: string;
  readonly input: ContentTranslatableInput;
  readonly existing: ContentTranslatableState;
}

export interface ContentTranslatedField extends ContentTranslatableInput {
  readonly enPendiente?: boolean;
}

export interface ContentTranslationsDeps {
  readonly translationService: TranslationService;
  readonly logger: Logger;
}

function needsTranslation(
  input: ContentTranslatableInput,
  existing: ContentTranslatableState,
): boolean {
  const autoTranslate = input.autoTranslate ?? true;
  if (input.es === '') return false;
  if (input.en !== undefined && input.en !== '') return false;
  if (!autoTranslate) return false;
  const esChanged = existing.es !== input.es;
  return esChanged || !existing.en;
}

async function resolveField(
  fieldPath: string,
  input: ContentTranslatableInput,
  existing: ContentTranslatableState,
  outputsByFieldPath: Map<string, string>,
  failedFieldPaths: Set<string>,
): Promise<ContentTranslatedField> {
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

export async function translateContentFields(
  candidates: readonly ContentTranslationCandidate[],
  deps: ContentTranslationsDeps,
  requestId?: string,
): Promise<ReadonlyMap<string, ContentTranslatedField>> {
  const { translationService, logger } = deps;

  const toTranslate = candidates.filter((c) => needsTranslation(c.input, c.existing));

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
        logger.error('translation_failed', result.error ?? new Error('translation_failed'), {
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
      const translationError = error instanceof Error ? error : new Error('translation_failed');
      logger.error('translation_failed', translationError, {
        requestId,
        fieldPaths: toTranslate.map((c) => c.fieldPath),
      });
      toTranslate.forEach((c) => failedFieldPaths.add(c.fieldPath));
    }
  }

  const results = new Map<string, ContentTranslatedField>();
  for (const candidate of candidates) {
    const translated = await resolveField(
      candidate.fieldPath,
      candidate.input,
      candidate.existing,
      outputsByFieldPath,
      failedFieldPaths,
    );
    results.set(candidate.fieldPath, translated);
  }

  return results;
}
