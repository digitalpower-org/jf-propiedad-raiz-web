/**
 * Lista TODAS las propiedades públicas leyendo el backend directo.
 *
 * El listado público exige `operacion` y `destacada` (no hay "dame todo") y
 * pagina con cursor (limit máx. 50), así que se recorren las 6 combinaciones
 * siguiendo `nextCursor`. El backend ya excluye lo que no es ACTIVE.
 */

import 'server-only';
import type { PropertyCard } from '@jf/shared-types';
import { backendUrl } from '@/server/backend-url';
import { env } from '@/server/config/server-config';

const OPERACIONES = ['VENTA', 'ALQUILER', 'PROYECTO_SOBRE_PLANOS'] as const;
const DESTACADAS = [true, false] as const;
const PAGE_SIZE = 50;
/** Tope de seguridad por combinación (5000 inmuebles): evita bucles infinitos. */
export const MAX_PAGES = 100;

interface ListBody {
  success?: boolean;
  data?: { items?: PropertyCard[]; nextCursor?: string | null };
}

export async function fetchAllPublicProperties(): Promise<PropertyCard[]> {
  const result: PropertyCard[] = [];

  for (const operacion of OPERACIONES) {
    for (const destacada of DESTACADAS) {
      let cursor: string | undefined;

      for (let page = 0; page < MAX_PAGES; page++) {
        const qs = new URLSearchParams({
          operacion,
          destacada: String(destacada),
          limit: String(PAGE_SIZE),
        });
        if (cursor) qs.set('cursor', cursor);

        const res = await fetch(backendUrl(`/api/v1/properties?${qs.toString()}`), {
          headers: { 'X-Internal-Key': env.BFF_INTERNAL_KEY, Accept: 'application/json' },
          cache: 'no-store',
        });
        if (!res.ok) {
          throw new Error(`El backend respondió ${res.status} al listar propiedades públicas.`);
        }

        const body = (await res.json()) as ListBody;
        const items = body.data?.items;
        if (!body.success || !Array.isArray(items)) {
          throw new Error('Respuesta inesperada del backend al listar propiedades públicas.');
        }

        result.push(...items);
        const next = body.data?.nextCursor;
        if (!next) break;
        cursor = next;
      }
    }
  }

  return result;
}
