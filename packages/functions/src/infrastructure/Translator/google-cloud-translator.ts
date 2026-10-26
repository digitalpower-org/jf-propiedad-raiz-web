/**
 * GoogleCloudTranslator (US0.5, AC0.5.8)
 *
 * Implementacion real del puerto Translator usando Google Cloud Translation API.
 * Solo esta clase (infraestructura) importa el SDK del proveedor.
 * Respetan el short-circuit: inputs vacios -> sin salida; textos vacios -> "".
 */

import { v2 } from '@google-cloud/translate';

import type {
  Translator,
  TranslateResult,
  TranslationInput,
  TranslationOutput,
} from './translator';

export class GoogleCloudTranslator implements Translator {
  private readonly client: v2.Translate;
  private readonly timeoutMs: number;

  constructor(config?: { timeoutMs?: number; projectId?: string }) {
    this.client = config?.projectId
      ? new v2.Translate({ projectId: config.projectId })
      : new v2.Translate();
    this.timeoutMs = config?.timeoutMs ?? 10_000;
  }

  async translate(inputs: readonly TranslationInput[]): Promise<TranslateResult> {
    if (!inputs || inputs.length === 0) {
      return { outputs: [], hasErrors: false };
    }

    const outputs: TranslationOutput[] = [];
    const textsToTranslate: string[] = [];
    const indicesToTranslate: number[] = [];

    inputs.forEach((input, index) => {
      if (!input.text) {
        outputs.push({ fieldPath: input.fieldPath, translated: '' });
      } else {
        outputs.push({ fieldPath: input.fieldPath, translated: '' });
        textsToTranslate.push(input.text);
        indicesToTranslate.push(index);
      }
    });

    if (indicesToTranslate.length === 0) {
      return { outputs, hasErrors: false };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const [translation] = await this.client.translate(textsToTranslate, { from: 'es', to: 'en' });

      clearTimeout(timer);

      let translatedTexts: string[];
      if (Array.isArray(translation)) {
        translatedTexts = translation;
      } else if (typeof translation === 'string') {
        translatedTexts = [translation];
      } else {
        throw new Error('Respuesta inesperada de Google Cloud Translation');
      }

      let cursor = 0;
      for (const originalIndex of indicesToTranslate) {
        const input = inputs[originalIndex];
        const translatedText = translatedTexts[cursor];
        if (input && translatedText) {
          outputs[originalIndex] = { fieldPath: input.fieldPath, translated: translatedText };
        }
        cursor++;
      }

      return { outputs, hasErrors: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { outputs, hasErrors: true, error: message };
    }
  }
}

export function createGoogleCloudTranslator(config?: {
  timeoutMs?: number;
  projectId?: string;
}): Translator {
  return new GoogleCloudTranslator(config);
}
