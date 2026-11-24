import { useEffect } from 'react';

/**
 * Con un filtro de frontend activo (AC2.2.6) carga solas las páginas restantes, para filtrar
 * sobre el total (el catálogo es pequeño). Si la página siguiente falló, no reintenta: el
 * reintento es explícito (botón «Reintentar»).
 */
export function useCargarTodo(
  activo: boolean,
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
  fetchNextPage: () => void,
  isNextPageError = false,
): void {
  useEffect(() => {
    if (activo && hasNextPage && !isFetchingNextPage && !isNextPageError) {
      fetchNextPage();
    }
  }, [activo, hasNextPage, isFetchingNextPage, fetchNextPage, isNextPageError]);
}
