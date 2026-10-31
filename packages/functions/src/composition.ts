// Composition root (5.1)
// createTranslator() lee TRANSLATOR_FAKE del entorno:
//   '1' → traductor falso (desarrollo/pruebas/seed, sin credenciales ni costo, AC0.5.9)
//   cualquier otro → Google Cloud Translation (producción)

import { createFakeTranslator } from './infrastructure/Translator/fake-translator';
import { createGoogleCloudTranslator } from './infrastructure/Translator/google-cloud-translator';
import type { Translator } from './infrastructure/Translator/translator';

export function createTranslator(): Translator {
  if (process.env.TRANSLATOR_FAKE === '1') {
    return createFakeTranslator();
  }
  return createGoogleCloudTranslator();
}
