import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import React, { type ReactElement } from 'react';
import type { useTranslations } from 'next-intl';
import type { PropertyListParams } from '@/lib/api-catalog';
import type { IHttpClient } from '@/lib/http-client.types';
import { fetchPropertiesPage } from '@/lib/api-catalog';
import styles from './PropertyGrid.module.css';

export const PAGE_SIZE = 12;

/** Tarjetas esqueleto que se muestran al final de la lista mientras llega la página siguiente. */
const LOAD_MORE_SKELETONS = 4;

type Translator = ReturnType<typeof useTranslations>;

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
  // Clave estable con todos los filtros: si cambian, la consulta se repite desde la primera página.
  const filterKey = [
    params.tipo ?? '',
    params.departamento ?? '',
    params.municipio ?? '',
    params.precioMin ?? '',
    params.precioMax ?? '',
  ].join('|');

  return useInfiniteQuery({
    queryKey: ['properties', params.operacion, params.destacada, filterKey, params.cursor],
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
 * Con `isNextPageError` no reintenta solo: el reintento es explícito (botón «Reintentar»).
 */
export function useInfiniteScroll(
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
  fetchNextPage: () => void,
  isNextPageError = false,
): { ref: React.RefCallback<HTMLDivElement>; inView: boolean } {
  const { ref: inViewRef, inView } = useInView();

  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && !isNextPageError) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, isNextPageError]);

  return { ref: inViewRef, inView };
}

/**
 * Función pura de render: esqueletos de carga (AC2.3.3: tarjetas Skeleton, sin spinner).
 */
export function renderSkeletons(count = PAGE_SIZE): ReactElement {
  return (
    <div className={styles.skeletonGrid}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.skeleton} data-testid="skeleton-card" />
      ))}
    </div>
  );
}

/**
 * Función pura de render: estado de error (carga inicial).
 */
export function renderError(t: Translator): ReactElement {
  return (
    <div className={styles.errorState}>
      <svg
        className={styles.errorIcon}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <h3 className={styles.errorTitle}>{t('loadError')}</h3>
      <p className={styles.errorMessage}>{t('loadErrorHint')}</p>
    </div>
  );
}

/**
 * Función pura de render: estado vacío.
 */
export function renderEmpty(t: Translator): ReactElement {
  return (
    <div className={styles.emptyState}>
      <svg
        className={styles.emptyIcon}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
      <h3 className={styles.emptyTitle}>{t('emptyTitle')}</h3>
      <p className={styles.emptyMessage}>{t('emptyHint')}</p>
    </div>
  );
}

/**
 * Función pura de render: disparador de carga al final de la lista.
 * El contenedor con `ref` (centinela del Intersection Observer) se mantiene en los tres estados.
 *  - Cargando: tarjetas esqueleto, sin spinner (AC2.3.3).
 *  - Error de la página siguiente: aviso propio + «Reintentar»; lo ya cargado se conserva (AC2.3.7).
 *  - Reposo: botón «Cargar más» (AC2.3.4).
 */
export function renderLoadMore(
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
  fetchNextPage: () => void,
  t: Translator,
  ref: React.RefCallback<HTMLDivElement>,
  isNextPageError = false,
): ReactElement | null {
  if (!(hasNextPage || isFetchingNextPage)) return null;

  return (
    <div className={styles.loadMore}>
      <div ref={ref} className={styles.loadMoreSentinel}>
        {isFetchingNextPage ? (
          <div className={styles.loadMoreSkeletons} role="status" aria-label={t('loadingMore')}>
            {renderSkeletons(LOAD_MORE_SKELETONS)}
          </div>
        ) : isNextPageError ? (
          <div className={styles.loadMoreError} role="alert">
            <p className={styles.loadMoreErrorText}>{t('loadMoreError')}</p>
            <button
              type="button"
              onClick={() => fetchNextPage()}
              className={`${styles.loadMoreButton} ${styles.loadMoreRetry}`}
            >
              {t('retry')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fetchNextPage()}
            className={`${styles.loadMoreButton} ${styles.loadMorePrimary}`}
          >
            {t('loadMore')}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Función pura de render: mensaje de fin de lista.
 */
export function renderEndOfList(t: Translator): ReactElement {
  return <div className={styles.endOfList}>{t('endOfList')}</div>;
}
