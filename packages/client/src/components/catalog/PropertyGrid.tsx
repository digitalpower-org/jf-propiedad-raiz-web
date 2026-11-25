'use client';
import React from 'react';
import { useTranslations } from 'next-intl';
import { PropertyCardComponent } from './PropertyCard';
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
  renderReserva,
  renderSkeletons,
} from './property-grid-hooks';
import { useCargarTodo } from './useCargarTodo';
import { useRetraso } from './useRetraso';
import { resumirFiltros, urlWhatsAppSinResultados } from '@/lib/catalog-resumen';
import { buildWhatsAppUrl, getWhatsAppNumber } from '@/lib/whatsapp';

import styles from './PropertyGrid.module.css';

interface PropertyGridProps {
  readonly operacion: 'VENTA' | 'ALQUILER' | 'PROYECTO_SOBRE_PLANOS';
  readonly locale: 'es' | 'en';
  readonly filters?: Partial<PropertyListParams>;
  /** Filtros que se aplican en el navegador sobre lo ya cargado (D9, AC2.2.5). */
  readonly frontendFilters?: FiltrosFrontend | undefined;
  readonly httpClient?: IHttpClient;
}

export function PropertyGrid({
  operacion,
  locale,
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

  const featuredItems = React.useMemo(() => {
    if (!featuredData) return [];
    return featuredData.pages.flatMap((page) => (page.success ? page.data.items : []));
  }, [featuredData]);

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

  // AC2.2.10: enlace de WhatsApp con un resumen de los filtros activos (sin número: sin botón).
  const urlWhatsApp = React.useMemo(() => {
    const resumen = resumirFiltros(filters ?? {}, frontendFilters ?? {}, locale);
    return urlWhatsAppSinResultados(getWhatsAppNumber(), resumen, locale, buildWhatsAppUrl);
  }, [filters, frontendFilters, locale]);

  // AC2.2.9: el skeleton solo aparece si la espera supera ~200 ms; antes se reserva el hueco.
  const esperando =
    (isLoading && allItems.length === 0) ||
    (!(isError && !data) &&
      visibleItems.length === 0 &&
      filtrosActivos &&
      pendiente &&
      !isNextPageError);
  const mostrarEsqueleto = useRetraso(esperando);

  if (isLoading && allItems.length === 0) {
    return mostrarEsqueleto ? renderSkeletons() : renderReserva();
  }

  // Initial load error (no data yet)
  if (isError && !data) {
    return renderError(t);
  }

  if (visibleItems.length === 0) {
    // Sin coincidencias aún, pero faltan páginas: no se declara vacío hasta haber cargado todo.
    if (filtrosActivos && pendiente && !isNextPageError) {
      return mostrarEsqueleto ? renderSkeletons() : renderReserva();
    }
    return renderEmpty(t, urlWhatsApp);
  }

  return (
    <>
      {filtrosActivos && !pendiente && (
        <p className={styles.resultCount} data-testid="result-count" aria-live="polite">
          {t('resultsCount', { count: visibleItems.length })}
        </p>
      )}

      <p className={styles.orderLabel} data-testid="order-label">
        {t('orderLabel')}
      </p>

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
