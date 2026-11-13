/**
 * Extracto de «Nosotros» para la portada (AC2.6.4): lee el backend directo.
 * `/api/v1/about` devuelve en `data` el documento único, con `extracto` traducible.
 */

import 'server-only';
import type { Translatable } from '@jf/shared-types';
import type { Locale } from '@/i18n/config';
import { backendUrl } from '@/server/backend-url';
import { env } from '@/server/config/server-config';

interface AboutBody {
  success?: boolean;
  data?: unknown;
}

const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Texto del extracto en `locale` (con respaldo al español), o `null` si no hay nada que mostrar (AC2.6.5). */
export async function fetchAboutExtractServer(locale: Locale): Promise<string | null> {
  const res = await fetch(backendUrl('/api/v1/about'), {
    headers: { 'X-Internal-Key': env.BFF_INTERNAL_KEY, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`El backend respondió ${res.status} al pedir «Nosotros».`);
  }

  const body = (await res.json()) as AboutBody;
  const data = body.data;
  if (!body.success || typeof data !== 'object' || data === null) {
    throw new Error('Respuesta inesperada del backend al pedir «Nosotros».');
  }

  const extracto = (data as { extracto?: Translatable }).extracto;
  return clean(extracto?.[locale]) || clean(extracto?.es) || null;
}
