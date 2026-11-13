import { httpClient, type ApiResponse } from './http-client';
import type { IHttpClient } from './http-client.types';
import { HttpClientAdapter } from './http-client.types';
import type { PropertyCard, PropertyDetail } from '@jf/shared-types';

/**
 * Cliente API para el catálogo público - consume BFF /api/properties
 * Maneja la paginación por cursor y la lógica de destacadas/no-destacadas
 */

export interface PropertyListParams {
  readonly operacion: 'VENTA' | 'ALQUILER' | 'PROYECTO_SOBRE_PLANOS';
  readonly destacada: boolean;
  readonly tipo?: string | undefined;
  readonly departamento?: string | undefined;
  readonly municipio?: string | undefined;
  readonly precioMin?: number | undefined;
  readonly precioMax?: number | undefined;
  readonly cursor?: string | undefined;
  readonly limit?: number | undefined;
}

export interface PropertyListData {
  readonly items: readonly PropertyCard[];
  readonly nextCursor: string | null;
}

export interface AboutDocument {
  readonly titulo: import('@jf/shared-types').Translatable;
  readonly extracto: import('@jf/shared-types').Translatable;
  readonly secciones: readonly {
    readonly id: string;
    readonly titulo: import('@jf/shared-types').Translatable;
    readonly cuerpo: import('@jf/shared-types').Translatable;
  }[];
  readonly equipo: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly cargo: import('@jf/shared-types').Translatable;
    readonly descripcion?: import('@jf/shared-types').Translatable;
    readonly foto?: string;
  }[];
  readonly updatedAt: string;
}

function buildPropertiesUrl(params: PropertyListParams): string {
  const searchParams = new URLSearchParams();
  searchParams.set('operacion', params.operacion);
  searchParams.set('destacada', String(params.destacada));
  if (params.tipo) searchParams.set('tipo', params.tipo);
  if (params.departamento) searchParams.set('departamento', params.departamento);
  if (params.municipio) searchParams.set('municipio', params.municipio);
  if (params.precioMin) searchParams.set('precioMin', String(params.precioMin));
  if (params.precioMax) searchParams.set('precioMax', String(params.precioMax));
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.limit) searchParams.set('limit', String(params.limit));
  return `/api/properties?${searchParams.toString()}`;
}

export async function fetchPropertiesPage(
  params: PropertyListParams,
  httpClientInstance?: IHttpClient,
): Promise<ApiResponse<PropertyListData>> {
  const url = buildPropertiesUrl(params);
  const client = httpClientInstance ?? new HttpClientAdapter();
  return client.get<PropertyListData>(url);
}

export async function fetchPropertyBySlug(
  slug: string,
  locale: 'es' | 'en',
): Promise<ApiResponse<PropertyDetail>> {
  return httpClient<PropertyDetail>(`/api/properties/${slug}`);
}

export async function fetchAbout(): Promise<ApiResponse<AboutDocument>> {
  return httpClient<AboutDocument>(`/api/about`);
}
