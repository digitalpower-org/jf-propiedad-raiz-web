/**
 * Servicios públicos con su contenido completo (listado y detalle).
 * El backend no tiene detalle público por slug: el listado `/api/v1/services`
 * ya trae `cuerpo` y solo devuelve los ACTIVE, así que el detalle se busca ahí.
 */

import 'server-only';
import type { Translatable } from '@jf/shared-types';
import { backendUrl } from '@/server/backend-url';
import { env } from '@/server/config/server-config';

export interface ServiceDetail {
  readonly slug: string;
  readonly orden: number;
  readonly titulo: Translatable;
  readonly resumen?: Translatable | undefined;
  readonly cuerpo?: Translatable | undefined;
}

interface RawService {
  slug?: string | undefined;
  status?: string | undefined;
  orden?: number | undefined;
  titulo?: Translatable | undefined;
  resumen?: Translatable | undefined;
  cuerpo?: Translatable | undefined;
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

export async function fetchActiveServicesServer(): Promise<ServiceDetail[]> {
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
    .map(({ slug, orden, titulo, resumen, cuerpo }) => ({ slug, orden, titulo, resumen, cuerpo }));
}

export async function fetchServiceBySlugServer(slug: string): Promise<ServiceDetail | null> {
  const services = await fetchActiveServicesServer();
  return services.find((service) => service.slug === slug) ?? null;
}
