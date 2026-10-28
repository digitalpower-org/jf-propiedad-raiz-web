/**
 * FakeTranslator (US0.5, AC0.5.9)
 *
 * Implementación del puerto Translator para desarrollo local, pruebas y seed.
 * No invoca credenciales reales ni genera costo.
 * Simula una traducción añadiendo el sufijo " (EN)" al texto original.
 * Respetan el short-circuit: inputs vacíos → sin salida; textos vacíos → "".
 */

import type {
  Translator,
  TranslateResult,
  TranslationInput,
  TranslationOutput,
} from './translator';

export class FakeTranslator implements Translator {
  readonly translate = async (inputs: readonly TranslationInput[]): Promise<TranslateResult> => {
    // Short-circuit: lote vacío → salida vacía, sin invocar nada (Corrección C.1)
    if (!inputs || inputs.length === 0) {
      return { outputs: [], hasErrors: false };
    }

    const outputs: TranslationOutput[] = [];

    for (const input of inputs) {
      // Short-circuit: texto vacío → salida vacía sin procesar (Corrección C.2)
      if (!input.text) {
        outputs.push({ fieldPath: input.fieldPath, translated: '' });
        continue;
      }

      // "Traducción" falsa: preserva el texto original + sufijo identificativo
      outputs.push({ fieldPath: input.fieldPath, translated: `${input.text} (EN)` });
    }

    return { outputs, hasErrors: false };
  };
}

export function createFakeTranslator(): Translator {
  return new FakeTranslator();
}
