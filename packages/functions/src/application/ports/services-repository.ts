// Puerto de persistencia de servicios (MT2.4, MT4.2).
// Implementado por Firestore.

import type { Translatable, Foto, EstadoPropiedad } from '@jf/shared-types';

export interface ServiceDto {
  readonly id: string;
  readonly slug: string;
  readonly status: EstadoPropiedad;
  readonly titulo: Translatable;
  readonly resumen: Translatable;
  readonly cuerpo: Translatable;
  readonly orden: number;
  readonly fotos?: readonly Foto[];
  readonly updatedAt: string;
}

/** Tarjeta ligera para listados públicos (AC7.4.1, AC7.5.7). */
export interface ServiceCardDto {
  readonly id: string;
  readonly slug: string;
  readonly titulo: { readonly es: string; readonly en?: string };
  readonly resumen: { readonly es: string; readonly en?: string };
  readonly orden: number;
  readonly portada?: readonly { readonly clave: string; readonly ancho: number }[] | undefined;
}

/** Resultado paginado del listado público (AC1.10.2, AC5.1.1). */
export interface ListarPaginadoResult {
  readonly items: readonly ServiceCardDto[];
  readonly nextCursor: string | undefined;
}

/** Filtros para el listado paginado público de servicios. */
export interface FiltrosListadoServicios {
  readonly cursor?: string;
  readonly limit?: number;
  readonly includeHidden?: boolean;
}

/** DTO de entrada para campos traducibles (solo es, en?, autoTranslate?). */
export interface TranslatableInputDto {
  readonly es: string;
  readonly en?: string;
  readonly autoTranslate?: boolean;
}

/** DTO de entrada para crear un servicio. */
export interface CrearServiceInputDto {
  readonly titulo: TranslatableInputDto;
  readonly resumen: TranslatableInputDto;
  readonly cuerpo: TranslatableInputDto;
  readonly fotos?: readonly Foto[];
  readonly orden?: number;
}

/** DTO de entrada para actualizar un servicio. */
export interface ActualizarServiceInputDto {
  readonly titulo?: TranslatableInputDto;
  readonly resumen?: TranslatableInputDto;
  readonly cuerpo?: TranslatableInputDto;
  readonly fotos?: readonly Foto[];
  readonly orden?: number;
  readonly status?: EstadoPropiedad;
}

/** Resultado de crear un servicio. */
export interface CrearServiceResult {
  readonly service: ServiceDto;
}

/** Resultado de actualizar un servicio. */
export interface ActualizarServiceResult {
  readonly service: ServiceDto;
}

/** Resultado de obtener un servicio por id o slug. */
export interface ObtenerPorIdOSlugResult {
  readonly service: ServiceDto;
  readonly esPublico: boolean;
}

/** Puerto de persistencia de servicios. Implementado por Firestore. */
export interface ServiciosRepository {
  readonly crear: (input: CrearServiceInputDto) => Promise<CrearServiceResult>;
  readonly actualizar: (
    idOrSlug: string,
    input: ActualizarServiceInputDto,
  ) => Promise<ActualizarServiceResult>;
  readonly eliminar: (idOrSlug: string) => Promise<{ service: ServiceDto }>;
  readonly activar: (idOrSlug: string) => Promise<{ service: ServiceDto }>;
  readonly ocultar: (idOrSlug: string) => Promise<{ service: ServiceDto }>;
  readonly reordenar: (items: readonly { id: string; orden: number }[]) => Promise<void>;
  readonly obtenerPorIdOSlug: (
    idOrSlug: string,
    esPublico: boolean,
    includeHidden?: boolean,
  ) => Promise<ObtenerPorIdOSlugResult | null>;
  readonly listarPaginado: (filtros?: FiltrosListadoServicios) => Promise<ListarPaginadoResult>;
}
