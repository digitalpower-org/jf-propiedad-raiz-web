/**
 * Construcción de URLs del backend de Cloud Functions.
 *
 * Tanto el emulador como producción montan cada función exportada bajo
 * `<base>/<functionName>`, donde `<base>` es solo proyecto + región
 * (p. ej. `http://127.0.0.1:5001/jf-propiedad-raiz/us-central1`). Por eso el
 * nombre de la función exportada debe formar parte de la URL final:
 * `.../us-central1/internalAuth/internal/auth/verify`, nunca
 * `.../us-central1/internal/auth/verify` (esto último devuelve 404).
 */

import { functionsBaseUrl } from '@/server/config/server-config';

/** Prefijo del path interno → función Cloud Functions exportada que lo atiende. */
const FUNCTION_BY_PREFIX = [
  { prefix: '/internal/', functionName: 'internalAuth' },
  // PROVISIONAL: la función `api` aún no existe en `packages/functions/src/index.ts`.
  // Se deja el mapeo explícito para cuando se cree; hasta entonces estas rutas
  // fallarán en el emulador con 404 (comportamiento esperado, no silencioso).
  { prefix: '/api/v1/', functionName: 'api' },
] as const;

const base = functionsBaseUrl.replace(/\/+$/, '');

/**
 * Resuelve la función que atiende `internalPath` y devuelve la URL completa.
 *
 * @throws Error si el path no coincide con ningún prefijo conocido: es
 * preferible fallar ruidosamente antes que reenviar a una URL incorrecta.
 */
export function backendUrl(internalPath: string): string {
  const mapping = FUNCTION_BY_PREFIX.find(({ prefix }) => internalPath.startsWith(prefix));

  if (!mapping) {
    const prefixes = FUNCTION_BY_PREFIX.map(({ prefix }) => prefix).join(', ');
    throw new Error(
      `No hay función de Cloud Functions asociada al path interno "${internalPath}". ` +
        `Prefijos válidos: ${prefixes}.`,
    );
  }

  return `${base}/${mapping.functionName}${internalPath}`;
}

/**
 * Construye la URL de una función concreta sin prefijo de path interno
 * (p. ej. `backendUrlForFunction('health')` → `<base>/health`).
 */
export function backendUrlForFunction(functionName: string, subPath = ''): string {
  const suffix = subPath === '' ? '' : `/${subPath.replace(/^\/+/, '')}`;
  return `${base}/${functionName}${suffix}`;
}
