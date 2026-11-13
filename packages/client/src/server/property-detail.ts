/**
 * Lectura de la ficha pública de un inmueble desde componentes de servidor.
 *
 * Llama al backend directamente: un componente de servidor no tiene origen
 * para resolver rutas relativas como `/api/properties/...`, por eso no puede
 * usar `httpClient` (pensado para el navegador).
 *
 * - 404 o respuesta sin datos → `null` (la página responde 404).
 * - Cualquier otro fallo (5xx, red) → lanza error (la página responde 500).
 */

import 'server-only';
import type { PropertyDetail } from '@jf/shared-types';
import { backendUrl } from '@/server/backend-url';
import { env } from '@/server/config/server-config';

export async function fetchPropertyDetailServer(slug: string): Promise<PropertyDetail | null> {
  const res = await fetch(backendUrl(`/api/v1/properties/${encodeURIComponent(slug)}`), {
    headers: { 'X-Internal-Key': env.BFF_INTERNAL_KEY, Accept: 'application/json' },
    cache: 'no-store',
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`El backend respondió ${res.status} al leer la ficha del inmueble.`);
  }

  const body = (await res.json()) as { success?: boolean; data?: PropertyDetail };
  if (!body.success || !body.data) return null;
  return body.data;
}
