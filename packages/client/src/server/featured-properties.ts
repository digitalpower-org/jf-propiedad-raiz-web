/**
 * Destacadas de la portada (AC2.6.2): lee el backend directo.
 * `/api/v1/properties/featured` devuelve en `data` un ARREGLO de tarjetas
 * (no `{ items }` como el listado paginado).
 */

import 'server-only';
import type { PropertyCard } from '@jf/shared-types';
import { backendUrl } from '@/server/backend-url';
import { env } from '@/server/config/server-config';

interface FeaturedBody {
  success?: boolean;
  data?: unknown;
}

export async function fetchFeaturedPropertiesServer(): Promise<PropertyCard[]> {
  const res = await fetch(backendUrl('/api/v1/properties/featured'), {
    headers: { 'X-Internal-Key': env.BFF_INTERNAL_KEY, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`El backend respondió ${res.status} al pedir las destacadas.`);
  }

  const body = (await res.json()) as FeaturedBody;
  if (!body.success || !Array.isArray(body.data)) {
    throw new Error('Respuesta inesperada del backend al pedir las destacadas.');
  }
  return body.data as PropertyCard[];
}
