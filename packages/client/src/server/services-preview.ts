/**
 * Servicios de la portada: lee el backend directo.
 * `/api/v1/services` devuelve `data: { items: [...] }` con solo los ACTIVE.
 */

import 'server-only';
import type { Translatable } from '@jf/shared-types';
import { backendUrl } from '@/server/backend-url';
import { env } from '@/server/config/server-config';

const MAX_SERVICES = 3;

export interface ServicePreview {
  readonly slug: string;
  readonly orden: number;
  readonly titulo: Translatable;
  readonly resumen?: Translatable | undefined;
}

interface RawService {
  slug?: string | undefined;
  status?: string | undefined;
  orden?: number | undefined;
  titulo?: Translatable | undefined;
  resumen?: Translatable | undefined;
}

interface ShowableService extends RawService {
  slug: string;
  orden: number;
  titulo: Translatable;
}

interface ServicesBody {
  success?: boolean;
  data?: { items?: unknown };
}

// Sin slug no se puede armar el enlace de detalle: getRoute lanzaría y tumbaría la portada.
function isShowable(item: RawService): item is ShowableService {
  return (
    typeof item.slug === 'string' &&
    item.slug.trim() !== '' &&
    typeof item.titulo === 'object' &&
    item.titulo !== null &&
    typeof item.orden === 'number' &&
    (item.status === undefined || item.status === 'ACTIVE')
  );
}

export async function fetchServicesPreviewServer(): Promise<ServicePreview[]> {
  const res = await fetch(backendUrl('/api/v1/services'), {
    headers: { 'X-Internal-Key': env.BFF_INTERNAL_KEY, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`El backend respondió ${res.status} al pedir los servicios.`);
  }

  const body = (await res.json()) as ServicesBody;
  const items = body.data?.items;
  if (!body.success || !Array.isArray(items)) {
    throw new Error('Respuesta inesperada del backend al pedir los servicios.');
  }

  return (items as RawService[])
    .filter(isShowable)
    .sort((a, b) => a.orden - b.orden)
    .slice(0, MAX_SERVICES)
    .map(({ slug, orden, titulo, resumen }) => ({ slug, orden, titulo, resumen }));
}
