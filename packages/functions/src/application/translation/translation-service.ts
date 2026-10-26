/**
 * TranslationService (US0.5, AC0.5.5)
 *
 * Caso de uso de traducción. Orquesta el puerto Translator aplicando:
 * - Short-circuit de lote vacío y textos vacíos (definido en Translator).
 * - Reintento simple (1 reintento con backoff fijo) en caso de fallo elástico
 * (AC0.5.5: timeout/5xx/429). El reintento se vuelve a invocar con el sub-lote
 * de textos que no estaban vacíos.
 *
 * No conoce el proveedor: recibe el Translator por constructor (inyección).
 */

import type { Logger } from '../../infrastructure/logging/logger';
import type {
  Translator,
  TranslateResult,
  TranslationInput,
  TranslationOutput,
} from '../../infrastructure/Translator/translator';

/** Intervalo de backoff entre reintentos (ms). 500 ms (AC0.5.5). */
const RETRY_BACKOFF_MS = 500;

export interface TranslationServiceDeps {
  readonly translator: Translator;
  readonly logger: Logger;
}

export class TranslationService {
  private readonly translator: Translator;
  private readonly logger: Logger;

  constructor(deps: TranslationServiceDeps) {
    this.translator = deps.translator;
    this.logger = deps.logger;
  }

  /**
   * Traduce un lote de textos ES→EN.
   *
   * Short-circuit: si no hay textos traducibles (todos vacíos o lote vacío),
   * retorna inmediatamente sin invocar el SDK.
   *
   * Reintento simple: si la primera invocación falla (hasErrors), reintenta
   * una vez tras `RETRY_BACKOFF_MS`. Si el reintento también falla, propaga
   * el error del segundo intento.
   */
  async translateContent(inputs: readonly TranslationInput[]): Promise<TranslateResult> {
    // Short-circuit C.1: lote vacío
    if (!inputs || inputs.length === 0) {
      return { outputs: [], hasErrors: false };
    }

    // Short-circuit C.2: ningún texto traducible (todos vacíos)
    const hasNonEmpty = inputs.some((input) => input.text);
    if (!hasNonEmpty) {
      const outputs: TranslationOutput[] = inputs.map((input) => ({
        fieldPath: input.fieldPath,
        translated: '',
      }));
      return { outputs, hasErrors: false };
    }

    const firstAttempt = await this.translator.translate(inputs);

    if (!firstAttempt.hasErrors) {
      return firstAttempt;
    }

    // Reintento simple (AC0.5.5)
    this.logger.warn('translation_retry', {
      requestId: this.logger.requestId,
      error: firstAttempt.error,
    });

    await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS));

    const secondAttempt = await this.translator.translate(inputs);

    return secondAttempt;
  }
}
