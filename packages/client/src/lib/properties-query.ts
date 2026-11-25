import type { PropertyListData, PropertyListParams } from './api-catalog';
import type { ApiResponse } from './http-client';

/**
 * Clave y paginación de la consulta del catálogo, compartidas entre el hook del cliente
 * (`usePropertiesQuery`) y el prefetch del servidor (AC2.2.12): si difirieran, lo hidratado
 * no coincidiría con lo que el cliente pide y se volvería a descargar.
 */

/** Tamaño de página del catálogo. No forma parte de la clave. */
export const PAGE_SIZE = 12;

/** Clave estable con todos los filtros: si cambian, la consulta se repite desde la primera página. */
export function propertiesQueryKey(params: PropertyListParams): readonly unknown[] {
  const filterKey = [
    params.tipo ?? '',
    params.departamento ?? '',
    params.municipio ?? '',
    params.precioMin ?? '',
    params.precioMax ?? '',
  ].join('|');

  return ['properties', params.operacion, params.destacada, filterKey, params.cursor];
}

/** Cursor de la página siguiente, o `undefined` si no hay más (o si la respuesta fue un error). */
export function getNextPropertiesPageParam(
  lastPage: ApiResponse<PropertyListData>,
): string | undefined {
  if (lastPage.success && lastPage.data.nextCursor) {
    return lastPage.data.nextCursor;
  }
  return undefined;
}
