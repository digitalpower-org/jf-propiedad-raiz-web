// FakeTranslator extendido (5.2)
// Implementación del puerto Translator para desarrollo local, pruebas y seed.
// Además del modo normal (sufijo " (EN)"), soporta TRANSLATOR_FAKE_MODE=error
// para simular fallos de traducción y probar AC0.5.11 (campo queda Pendiente)
// y AC0.5.12 (edición manual no se re-traduce).

import type {
  Translator,
  TranslateResult,
  TranslationInput,
  TranslationOutput,
} from './translator';

const FAKE_MODE = process.env.TRANSLATOR_FAKE_MODE;

export class FakeTranslator implements Translator {
  readonly translate = async (inputs: readonly TranslationInput[]): Promise<TranslateResult> => {
    // Short-circuit: lote vacío → salida vacía, sin invocar nada
    if (!inputs || inputs.length === 0) {
      return { outputs: [], hasErrors: false };
    }

    // Modo error: simula fallo total del proveedor (AC0.5.5, AC0.5.11)
    if (FAKE_MODE === 'error') {
      return {
        outputs: [],
        hasErrors: true,
        error: 'simulated translation failure',
      };
    }

    const outputs: TranslationOutput[] = [];

    for (const input of inputs) {
      // Short-circuit: texto vacío → salida vacía sin procesar
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
