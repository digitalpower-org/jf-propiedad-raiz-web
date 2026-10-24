/**
 * Carga de diccionarios, un idioma a la vez (AC7.2.4).
 *
 * El mapa de loaders usa `import()` por idioma: el bundler genera un chunk por
 * archivo y solo se descarga el del idioma activo. Nunca importar `es.json` y
 * `en.json` estáticamente en el mismo módulo, porque ambos entrarían en el
 * grafo del cliente.
 *
 * `server-only` hace fallar la compilación si alguien importa esto desde un
 * componente de cliente.
 */

import 'server-only';

import type { Locale } from './config';
import type es from '../../messages/es.json';

/** Contrato de los diccionarios: `en.json` debe tener las mismas claves. */
export type Messages = typeof es;

const loaders: Record<Locale, () => Promise<{ default: Messages }>> = {
  es: () => import('../../messages/es.json'),
  en: () => import('../../messages/en.json'),
};

export async function loadMessages(locale: Locale): Promise<Messages> {
  const { default: messages } = await loaders[locale]();
  return messages;
}
