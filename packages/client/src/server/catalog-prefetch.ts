/**
 * Prefetch del catálogo en el servidor (AC2.2.12): pide al backend lo mismo que pediría el cliente
 * (mismo tamaño de página y filtros) y lo guarda con la misma clave, para que la primera carga
 * llegue ya hidratada en el HTML.
 *
 * Si algo falla (429, red, tiempo agotado, otra forma de respuesta) no se guarda nada y la página
 * se renderiza como antes: el cliente pide los datos él mismo.
 */

import 'server-only';
import {
  QueryClient,
  dehydrate,
  type DehydratedState,
  type InfiniteData,
} from '@tanstack/react-query';
import type { PropertyCard } from '@jf/shared-types';
import type { PropertyListData, PropertyListParams } from '@/lib/api-catalog';
import type { ApiResponse } from '@/lib/http-client';
import { PAGE_SIZE, getNextPropertiesPageParam, propertiesQueryKey } from '@/lib/properties-query';
import { backendUrl } from '@/server/backend-url';
import { env } from '@/server/config/server-config';

/** Más allá de este tiempo la página sale sin hidratar en lugar de quedarse esperando al backend. */
const TIMEOUT_MS = 2500;

interface PrefetchInput {
  readonly operacion: PropertyListParams['operacion'];
  readonly filtros: Partial<PropertyListParams>;
  readonly clientIp?: string | undefined;
}

/**
 * IP del visitante para que el backend limite por visitante y no por ruta (el cubo `ssr:<ruta>`
 * se agotaría con poco tráfico). Mismas reglas que el BFF: sale de las cabeceras del proxy y un
 * `X-Client-IP` enviado por el cliente nunca se usa.
 */
export function clientIpFromHeaders(headers: Headers): string | undefined {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip')?.trim() ||
    undefined
  );
}

async function fetchPage(
  params: PropertyListParams,
  clientIp: string | undefined,
): Promise<ApiResponse<PropertyListData>> {
  const qs = new URLSearchParams({
    operacion: params.operacion,
    destacada: String(params.destacada),
    limit: String(PAGE_SIZE),
  });
  if (params.tipo) qs.set('tipo', params.tipo);
  if (params.departamento) qs.set('departamento', params.departamento);
  if (params.municipio) qs.set('municipio', params.municipio);
  if (params.precioMin) qs.set('precioMin', String(params.precioMin));
  if (params.precioMax) qs.set('precioMax', String(params.precioMax));

  const headers: Record<string, string> = {
    'X-Internal-Key': env.BFF_INTERNAL_KEY,
    Accept: 'application/json',
  };
  if (clientIp) headers['X-Client-IP'] = clientIp;

  const res = await fetch(backendUrl(`/api/v1/properties?${qs.toString()}`), {
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`El backend respondió ${res.status} al listar el catálogo.`);
  }

  const body = (await res.json()) as {
    success?: boolean;
    data?: { items?: unknown; nextCursor?: unknown };
  };
  if (!body.success || !Array.isArray(body.data?.items)) {
    throw new Error('Respuesta inesperada del backend al listar el catálogo.');
  }

  return {
    success: true,
    data: {
      items: body.data.items as PropertyCard[],
      nextCursor: typeof body.data.nextCursor === 'string' ? body.data.nextCursor : null,
    },
  };
}

export async function prefetchCatalogo({
  operacion,
  filtros,
  clientIp,
}: PrefetchInput): Promise<DehydratedState> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const parametros = (destacada: boolean): PropertyListParams => ({
    ...filtros,
    operacion,
    destacada,
  });

  const precargar = (destacada: boolean) => {
    const params = parametros(destacada);
    return queryClient.prefetchInfiniteQuery({
      queryKey: propertiesQueryKey(params),
      queryFn: async () => {
        try {
          return await fetchPage(params, clientIp);
        } catch (error) {
          console.error('[catalogo] No se pudo precargar el listado:', error);
          throw error;
        }
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: getNextPropertiesPageParam,
    });
  };

  // Igual que PropertyGrid: primero las destacadas y, si se agotan en la primera página,
  // las no destacadas (así el HTML trae todo lo que el cliente mostraría de entrada).
  await precargar(true);
  const destacadas = queryClient.getQueryData<
    InfiniteData<ApiResponse<PropertyListData>, string | undefined>
  >(propertiesQueryKey(parametros(true)));
  const ultima = destacadas?.pages[destacadas.pages.length - 1];
  if (ultima && getNextPropertiesPageParam(ultima) === undefined) {
    await precargar(false);
  }

  return dehydrate(queryClient);
}
