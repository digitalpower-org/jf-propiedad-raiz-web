'use client';
import React from 'react';
import { useTranslations } from 'next-intl';
import { PropertyCardComponent } from './PropertyCard';
import type { PropertyCard } from '@jf/shared-types';
import type { PropertyListParams } from '@/lib/api-catalog';
import type { IHttpClient } from '@/lib/http-client.types';
import {
  filtrarEnNavegador,
  hayFiltrosFrontend,
  type FiltrosFrontend,
} from '@/lib/catalog-filters';
import {
  buildQueryParams,
  useInfiniteScroll,
  usePropertiesQuery,
  renderEndOfList,
  renderEmpty,
  renderError,
  renderLoadMore,
  renderSkeletons,
} from './property-grid-hooks';
import { useCargarTodo } from './useCargarTodo';

import styles from './PropertyGrid.module.css';

interface PropertyGridProps {
  readonly operacion: 'VENTA' | 'ALQUILER' | 'PROYECTO_SOBRE_PLANOS';
  readonly locale: 'es' | 'en';
  readonly initialData?: PropertyCard[] | undefined;
  readonly filters?: Partial<PropertyListParams>;
  /** Filtros que se aplican en el navegador sobre lo ya cargado (D9, AC2.2.5). */
  readonly frontendFilters?: FiltrosFrontend | undefined;
  readonly httpClient?: IHttpClient;
}

export function PropertyGrid({
  operacion,
  locale,
  initialData,
  filters,
  frontendFilters,
  httpClient,
}: PropertyGridProps) {
  const [showDestacadas, setShowDestacadas] = React.useState(true);
  const t = useTranslations('common');

  // Highlighted-query params
  const featuredParams = buildQueryParams(operacion, true, undefined, filters);
  const {
    data: featuredData,
    hasNextPage: hasFeaturedNextPage,
    isFetchingNextPage: isFetchingFeatured,
    isLoading: isLoadingFeatured,
  } = usePropertiesQuery(featuredParams, httpClient);

  // Combine initialData with fetched data without local state
  const featuredItems = React.useMemo(() => {
    if (!featuredData) return initialData || [];
    const fetchedItems = featuredData.pages.flatMap((page) =>
      page.success ? page.data.items : [],
    );
    const initial = initialData || [];
    const existingIds = new Set(initial.map((p) => p.id));
    const newItems = fetchedItems.filter((p) => !existingIds.has(p.id));
    return [...initial, ...newItems];
  }, [featuredData, initialData]);

  // Auto-switch to non-destacadas when destacadas are exhausted (only after initial load completes)
  const shouldSwitch =
    showDestacadas && !isLoadingFeatured && !hasFeaturedNextPage && !isFetchingFeatured;
  if (shouldSwitch) {
    setShowDestacadas(false);
  }

  // Active-query params (destacadas or not)
  const activeParams = buildQueryParams(operacion, showDestacadas, undefined, filters);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    usePropertiesQuery(activeParams, httpClient);

  const allItems = React.useMemo(() => {
    if (!data) return featuredItems;
    const fetchedItems = data.pages.flatMap((page) => (page.success ? page.data.items : []));
    const existingIds = new Set(featuredItems.map((p) => p.id));
    const newItems = fetchedItems.filter((p) => !existingIds.has(p.id));
    return [...featuredItems, ...newItems];
  }, [data, featuredItems]);

  // Filtros de frontend (AC2.2.5): se aplican en caliente sobre lo cargado, sin pedir nada.
  const filtrosActivos = frontendFilters !== undefined && hayFiltrosFrontend(frontendFilters);
  const visibleItems = React.useMemo(
    () =>
      frontendFilters && filtrosActivos ? filtrarEnNavegador(allItems, frontendFilters) : allItems,
    [allItems, frontendFilters, filtrosActivos],
  );

  // Next-page fetch error: data exists (initial load succeeded) but latest fetch failed
  const isNextPageError = data !== undefined && isError;

  // Quedan páginas por cargar (o la consulta activa aún no ha respondido).
  const pendiente = isLoading || hasNextPage || isFetchingNextPage;

  const { ref } = useInfiniteScroll(
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isNextPageError,
  );
  // AC2.2.6: con un filtro de frontend activo se cargan solas las páginas restantes.
  useCargarTodo(filtrosActivos, hasNextPage, isFetchingNextPage, fetchNextPage, isNextPageError);

  if (isLoading && allItems.length === 0) {
    return renderSkeletons();
  }

  // Initial load error (no data yet)
  if (isError && !data) {
    return renderError(t);
  }

  if (visibleItems.length === 0) {
    // Sin coincidencias aún, pero faltan páginas: no se declara vacío hasta haber cargado todo.
    if (filtrosActivos && pendiente && !isNextPageError) {
      return renderSkeletons();
    }
    return renderEmpty(t);
  }

  return (
    <>
      {filtrosActivos && !pendiente && (
        <p className={styles.resultCount} data-testid="result-count" aria-live="polite">
          {t('resultsCount', { count: visibleItems.length })}
        </p>
      )}

      <div className={styles.grid}>
        {visibleItems.map((property) => (
          <PropertyCardComponent key={property.id} property={property} locale={locale} />
        ))}
      </div>

      {renderLoadMore(hasNextPage, isFetchingNextPage, fetchNextPage, t, ref, isNextPageError)}

      {!hasNextPage && !isFetchingNextPage && visibleItems.length > 0 && renderEndOfList(t)}
    </>
  );
}
