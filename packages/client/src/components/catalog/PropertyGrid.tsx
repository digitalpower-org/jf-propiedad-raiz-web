'use client';
import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Skeleton } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { PropertyCardComponent } from './PropertyCard';
import type { PropertyCard } from '@jf/shared-types';
import { fetchPropertiesPage, type PropertyListParams } from '@/lib/api-catalog';

interface PropertyGridProps {
  readonly operacion: 'VENTA' | 'ALQUILER' | 'PROYECTO_SOBRE_PLANOS';
  readonly locale: 'es' | 'en';
  readonly initialData?: PropertyCard[] | undefined;
  readonly filters?: Partial<PropertyListParams>;
}

const PAGE_SIZE = 12;

export function PropertyGrid({ operacion, locale, initialData, filters }: PropertyGridProps) {
  const t = useTranslations();
  const [showDestacadas, setShowDestacadas] = React.useState(true);

  const { ref, inView } = useInView();

  const buildQueryParams = (
    isDestacada: boolean,
    cursor?: string | undefined,
  ): PropertyListParams => ({
    operacion,
    destacada: isDestacada,
    cursor: cursor ?? undefined,
    limit: PAGE_SIZE,
    ...(filters as Record<string, unknown>),
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useInfiniteQuery({
      queryKey: ['properties', operacion, locale, showDestacadas, filters],
      queryFn: ({ pageParam }) => fetchPropertiesPage(buildQueryParams(showDestacadas, pageParam)),
      getNextPageParam: (lastPage) => {
        if (lastPage.success && lastPage.data.nextCursor) {
          return lastPage.data.nextCursor;
        }
        return undefined;
      },
      initialPageParam: undefined as string | undefined,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      enabled: !initialData,
    });

  // Combine initialData with fetched data without local state
  const allItems = React.useMemo(() => {
    if (!data) return initialData || [];
    const fetchedItems = data.pages.flatMap((page) => (page.success ? page.data.items : []));
    const initial = initialData || [];
    const existingIds = new Set(initial.map((p) => p.id));
    const newItems = fetchedItems.filter((p) => !existingIds.has(p.id));
    return [...initial, ...newItems];
  }, [data, initialData]);

  // Auto-switch to non-destacadas when destacadas are exhausted (without effect setState)
  const shouldSwitch = showDestacadas && !hasNextPage && !isFetchingNextPage;
  if (shouldSwitch) {
    // Schedule state update for next render to avoid effect warning
    setShowDestacadas(false);
  }

  // Load more on scroll
  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading && allItems.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} height={380} className="rounded-xl border border-gray-200 bg-white" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-16">
        <svg
          className="w-16 h-16 mx-auto text-gray-300 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {locale === 'es' ? 'Error al cargar las propiedades.' : 'Error loading properties.'}
        </h3>
        <p className="text-gray-500">
          {locale === 'es'
            ? 'Intente recargar la página o ajustar los filtros.'
            : 'Try reloading the page or adjusting filters.'}
        </p>
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="text-center py-16">
        <svg
          className="w-16 h-16 mx-auto text-gray-300 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {locale === 'es'
            ? 'No hay inmuebles en este momento.'
            : 'No properties available at the moment.'}
        </h3>
        <p className="text-gray-500">
          {locale === 'es'
            ? 'Intente ajustar los filtros o ampliar el rango de búsqueda.'
            : 'Try adjusting filters or expanding the search range.'}
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
