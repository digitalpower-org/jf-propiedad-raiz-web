'use client';
import React from 'react';
import { PropertyCardComponent } from './PropertyCard';
import type { PropertyCard } from '@jf/shared-types';
import type { PropertyListParams } from '@/lib/api-catalog';
import type { IHttpClient } from '@/lib/http-client.types';
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

import styles from './PropertyGrid.module.css';

interface PropertyGridProps {
  readonly operacion: 'VENTA' | 'ALQUILER' | 'PROYECTO_SOBRE_PLANOS';
  readonly locale: 'es' | 'en';
  readonly initialData?: PropertyCard[] | undefined;
  readonly filters?: Partial<PropertyListParams>;
  readonly httpClient?: IHttpClient;
}

export function PropertyGrid({
  operacion,
  locale,
  initialData,
  filters,
  httpClient,
}: PropertyGridProps) {
  const [showDestacadas, setShowDestacadas] = React.useState(true);

  // Highlighted-query params
  const featuredParams = buildQueryParams(operacion, true, undefined, filters);
  const {
    data: featuredData,
    hasNextPage: hasFeaturedNextPage,
    isFetchingNextPage: isFetchingFeatured,
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

  // Auto-switch to non-destacadas when destacadas are exhausted
  const shouldSwitch = showDestacadas && !hasFeaturedNextPage && !isFetchingFeatured;
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

  const { ref } = useInfiniteScroll(hasNextPage, isFetchingNextPage, fetchNextPage);

  if (isLoading && allItems.length === 0) {
    return renderSkeletons();
  }

  if (isError) {
    return renderError(locale);
  }

  if (allItems.length === 0) {
    return renderEmpty(locale);
  }

  return (
    <>
      <div className={styles.grid}>
        {allItems.map((property) => (
          <PropertyCardComponent key={property.id} property={property} locale={locale} />
        ))}
      </div>

      {renderLoadMore(hasNextPage, isFetchingNextPage, fetchNextPage, locale, ref)}

      {!hasNextPage && !isFetchingNextPage && allItems.length > 0 && renderEndOfList(locale)}
    </>
  );
}
