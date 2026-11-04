'use client';
import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Skeleton } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { PropertyCardComponent } from './PropertyCard';
import type { PropertyCard } from '@jf/shared-types';
import { getDestacadasByOperacion, getNoDestacadasByOperacion } from '@/mocks/property-mock';

interface PropertyGridProps {
  readonly operacion: 'VENTA' | 'ALQUILER' | 'PROYECTO_SOBRE_PLANOS';
  readonly locale: 'es' | 'en';
  readonly initialData?: PropertyCard[] | undefined;
}

const PAGE_SIZE = 12;

async function fetchPropertiesPage(
  operacion: 'VENTA' | 'ALQUILER' | 'PROYECTO_SOBRE_PLANOS',
  pageParam: number,
  isDestacada: boolean
): Promise<{ items: PropertyCard[]; nextCursor: number | null }> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const destacadas = getDestacadasByOperacion(operacion);
  const noDestacadas = getNoDestacadasByOperacion(operacion);

  if (isDestacada) {
    const start = pageParam * PAGE_SIZE;
    const items = destacadas.slice(start, start + PAGE_SIZE);
    return {
      items,
      nextCursor: items.length === PAGE_SIZE ? pageParam + 1 : null,
    };
  } else {
    const start = pageParam * PAGE_SIZE;
    const items = noDestacadas.slice(start, start + PAGE_SIZE);
    return {
      items,
      nextCursor: items.length === PAGE_SIZE ? pageParam + 1 : null,
    };
  }
}

export function PropertyGrid({ operacion, locale, initialData }: PropertyGridProps) {
  const t = useTranslations();
  const [showDestacadas, setShowDestacadas] = React.useState(true);
  const [allItems, setAllItems] = React.useState<PropertyCard[]>(initialData || []);

  const { ref, inView } = useInView();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['properties', operacion, locale, showDestacadas],
    queryFn: ({ pageParam = 0 }) => fetchPropertiesPage(operacion, pageParam, showDestacadas),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: !initialData,
  });

  React.useEffect(() => {
    if (data) {
      const fetchedItems = data.pages.flatMap((page) => page.items);
      setAllItems((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newItems = fetchedItems.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newItems];
      });
    }
  }, [data]);

  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  React.useEffect(() => {
    if (showDestacadas && !hasNextPage && !isFetchingNextPage) {
      setShowDestacadas(false);
    }
  }, [showDestacadas, hasNextPage, isFetchingNextPage]);

  if (isLoading && allItems.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} height={380} className="rounded-xl border border-gray-200 bg-white" />
        ))}
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="text-center py-16">
        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {locale === 'es' ? 'No hay inmuebles en este momento.' : 'No properties available at the moment.'}
        </h3>
        <p className="text-gray-500">
          {locale === 'es' ? 'Intente ajustar los filtros o ampliar el rango de búsqueda.' : 'Try adjusting filters or expanding the search range.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {allItems.map((property) => (
          <PropertyCardComponent key={property.id} property={property} locale={locale} />
        ))}
      </div>

      {(hasNextPage || isFetchingNextPage) && (
        <div ref={ref} className="flex justify-center py-8">
          {isFetchingNextPage ? (
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600">
                {locale === 'es' ? 'Cargando más propiedades...' : 'Loading more properties...'}
              </span>
            </div>
          ) : (
            <button
              onClick={() => fetchNextPage()}
              className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              {locale === 'es' ? 'Cargar más' : 'Load More'}
            </button>
          )}
        </div>
      )}

      {!hasNextPage && !isFetchingNextPage && allItems.length > 0 && (
        <p className="text-center text-gray-500 py-8">
          {locale === 'es' ? 'Fin de la lista' : 'End of list'}
        </p>
      )}
    </>
  );
}