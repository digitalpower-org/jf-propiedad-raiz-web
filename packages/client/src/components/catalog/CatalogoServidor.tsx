import { headers } from 'next/headers';
import { HydrationBoundary } from '@tanstack/react-query';
import { CatalogClient } from '@/components/catalog/CatalogClient';
import { QueryClientProviderWrapper } from '@/components/catalog/QueryClientProvider';
import { filtrosParaApi, leerFiltrosDeUrl } from '@/lib/catalog-filters';
import { aURLSearchParams } from '@/lib/search-params';
import { clientIpFromHeaders, prefetchCatalogo } from '@/server/catalog-prefetch';

interface CatalogoServidorProps {
  readonly operacion: 'VENTA' | 'ALQUILER' | 'PROYECTO_SOBRE_PLANOS';
  readonly locale: 'es' | 'en';
  readonly searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Catálogo con primera carga hidratada desde el servidor (AC2.2.12): lee los filtros de la URL,
 * pide al backend la misma página que pediría el cliente y la entrega dentro de HydrationBoundary.
 * Si el prefetch falla, `prefetchCatalogo` devuelve un estado vacío y el cliente pide los datos él mismo.
 */
export async function CatalogoServidor({ operacion, locale, searchParams }: CatalogoServidorProps) {
  const consulta = aURLSearchParams(await searchParams);
  const filtros = filtrosParaApi(leerFiltrosDeUrl(consulta));
  const cabeceras = await headers();
  const estado = await prefetchCatalogo({
    operacion,
    filtros,
    clientIp: clientIpFromHeaders(cabeceras),
  });

  return (
    <QueryClientProviderWrapper>
      <HydrationBoundary state={estado}>
        <CatalogClient operacion={operacion} locale={locale} />
      </HydrationBoundary>
    </QueryClientProviderWrapper>
  );
}
