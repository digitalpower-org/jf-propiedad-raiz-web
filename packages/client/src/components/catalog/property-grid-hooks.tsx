import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import React, { type ReactElement } from 'react';
import type { PropertyListParams } from '@/lib/api-catalog';
import type { IHttpClient } from '@/lib/http-client.types';
import { fetchPropertiesPage } from '@/lib/api-catalog';
import styles from './PropertyGrid.module.css';

export const PAGE_SIZE = 12;

/**
 * Función pura: construye los parámetros de consulta para una página de propiedades.
 * SRP: solo construye params, no hace fetching ni rendering.
 */
export function buildQueryParams(
  operacion: PropertyListParams['operacion'],
  isDestacada: boolean,
  cursor?: string | undefined,
  filters?: Partial<PropertyListParams>,
): PropertyListParams {
  return {
    operacion,
    destacada: isDestacada,
    cursor: cursor ?? undefined,
    limit: PAGE_SIZE,
    ...(filters as Record<string, unknown>),
  };
}

/**
 * Hook personalizado: encapsula la lógica de fetching paginado con TanStack Query.
 * SRP: solo maneja data fetching, no rendering.
 */
export function usePropertiesQuery(params: PropertyListParams, httpClient?: IHttpClient) {
  return useInfiniteQuery({
    queryKey: ['properties', params.operacion, params.destacada, params.cursor],
    queryFn: ({ pageParam }) =>
      fetchPropertiesPage({ ...params, cursor: pageParam as string | undefined }, httpClient),
    getNextPageParam: (lastPage) => {
      if (lastPage.success && lastPage.data.nextCursor) {
        return lastPage.data.nextCursor;
      }
      return undefined;
    },
    initialPageParam: undefined as string | undefined,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook personalizado: alterna entre destacadas y no-destacadas cuando las
 * primeras se agotan.
 * SRP: solo maneja la lógica de alternancia de destacadas.
 */
export function useDestacadasToggle(
  showDestacadas: boolean,
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
): boolean {
  const [current, setCurrent] = React.useState(showDestacadas);

  const shouldSwitch = current && !hasNextPage && !isFetchingNextPage;
  if (shouldSwitch) {
    setCurrent(false);
  }

  return current;
}

/**
 * Hook personalizado: detecta scroll infinito vía Intersection Observer.
 * SRP: solo maneja la detección de scroll y el fetch de la siguiente página.
 */
export function useInfiniteScroll(
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
  fetchNextPage: () => void,
): { ref: React.RefCallback<HTMLDivElement>; inView: boolean } {
  const { ref: inViewRef, inView } = useInView();

  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return { ref: inViewRef, inView };
}

/**
 * Función pura de render: esqueleto de carga.
 */
export function renderSkeletons(): ReactElement {
  return (
    <div className={styles.skeletonGrid}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className={styles.skeleton} />
      ))}
    </div>
  );
}

/**
 * Función pura de render: estado de error.
 */
export function renderError(locale: 'es' | 'en'): ReactElement {
  return (
    <div className={styles.emptyState}>
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

/**
 * Función pura de render: estado vacío.
 */
export function renderEmpty(locale: 'es' | 'en'): ReactElement {
  return (
    <div className={styles.emptyState}>
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

/**
 * Función pura de render: botón/indicador de cargar más.
 */
export function renderLoadMore(
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
  fetchNextPage: () => void,
  locale: 'es' | 'en',
  ref: React.RefCallback<HTMLDivElement>,
): ReactElement | null {
  if (!(hasNextPage || isFetchingNextPage)) return null;

  return (
    <div className={styles.loadMore}>
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
    </div>
  );
}

/**
 * Función pura de render: mensaje de fin de lista.
 */
export function renderEndOfList(locale: 'es' | 'en'): ReactElement {
  return (
    <div className={styles.endOfList}>{locale === 'es' ? 'Fin de la lista' : 'End of list'}</div>
  );
}
