import type { EstadoPropiedad, Operacion, TipoInmueble } from '@jf/shared-types';

/**
 * Filtros del listado público de inmuebles (AC1.10.1).
 * `departamento` y `municipio` van juntos o ninguno (D24).
 * `destacada` con un solo valor, nunca ambos (D28).
 */
export interface FiltrosListadoPublico {
  readonly operacion: Operacion;
  readonly destacada: boolean;
  readonly tipo?: TipoInmueble;
  readonly departamento?: string;
  readonly municipio?: string;
  readonly precioMin?: number;
  readonly precioMax?: number;
  readonly cursor?: string;
  readonly limit?: number;
}

/**
 * Tarjeta de listado público (proyección ligera, AC7.4.1).
 * Tipo plano (DTO): sin depender de la entidad `Property` de Domain.
 */
export interface PropertyCardDto {
  readonly id: string;
  readonly codigo: string;
  readonly slug: string;
  readonly operacion: Operacion;
  readonly tipo: TipoInmueble;
  readonly titulo: { readonly es: string; readonly en?: string };
  readonly precio: number;
  readonly departamento: string;
  readonly municipio: string;
  readonly portada?: readonly { readonly clave: string; readonly ancho: number }[] | undefined;
  readonly destacada: boolean;
  readonly createdAt: string;
}

/** Resultado paginado del listado público (AC1.10.2). */
export interface ListadoPublicoResult {
  readonly items: readonly PropertyCardDto[];
  readonly nextCursor: string | undefined;
}

/** Inmueble completo (DTO plano). Coincide con la forma de `Property` de Domain. */
export interface PropertyDto {
  readonly id: string;
  readonly codigo: string;
  readonly slug: string;
  readonly status: EstadoPropiedad;
  readonly operacion: Operacion;
  readonly tipo: TipoInmueble;
  readonly titulo: { readonly es: string; readonly en?: string };
  readonly descripcion?: { readonly es: string; readonly en?: string };
  readonly precio: number;
  readonly departamento: string;
  readonly municipio: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly fechaPublicacion?: string;
  readonly destacada: boolean;
  readonly estrato?: number;
  readonly predial?: string;
  readonly administracion?: string;
  readonly acabados?: { readonly es: string; readonly en?: string };
  readonly antiguedad?: string;
  readonly areaConstruida?: number;
  readonly areaLote?: number;
  readonly dormitorios?: number;
  readonly banos?: number;
  readonly parqueaderos?: number;
  readonly deposito?: number;
  readonly amenidades?: readonly string[];
  readonly fotos?: readonly unknown[];
  readonly videos?: readonly string[];
  readonly panoramas?: readonly unknown[];
  readonly proyecto?: {
    readonly etapa?: { readonly es: string; readonly en?: string };
    readonly fechaEntregaEstimada?: string;
    readonly unidadesDisponibles?: number;
  };
}

/** Resultado de obtener un inmueble por id o slug. */
export interface ObtenerPropertyResult {
  readonly property: PropertyDto;
  readonly esPublico: boolean;
}

/** DTO de entrada para crear un inmueble. */
export interface CrearPropertyInputDto {
  readonly operacion: Operacion;
  readonly tipo: TipoInmueble;
  readonly titulo: { readonly es: string; readonly en?: string };
  readonly descripcion?: { readonly es: string; readonly en?: string };
  readonly precio: number;
  readonly departamento: string;
  readonly municipio: string;
  readonly estrato?: number;
  readonly predial?: string;
  readonly administracion?: string;
  readonly acabados?: { readonly es: string; readonly en?: string };
  readonly antiguedad?: string;
  readonly areaConstruida?: number;
  readonly areaLote?: number;
  readonly dormitorios?: number;
  readonly banos?: number;
  readonly parqueaderos?: number;
  readonly deposito?: number;
  readonly amenidades?: readonly string[];
  readonly puntosInteres?: readonly unknown[];
  readonly fotos?: readonly unknown[];
  readonly videos?: readonly string[];
  readonly panoramas?: readonly unknown[];
  readonly destacada?: boolean;
  readonly proyecto?: {
    readonly etapa?: { readonly es: string; readonly en?: string };
    readonly fechaEntregaEstimada?: string;
    readonly unidadesDisponibles?: number;
  };
}

/** DTO de entrada para actualizar un inmueble. */
export interface ActualizarPropertyInputDto {
  readonly operacion?: Operacion;
  readonly tipo?: TipoInmueble;
  readonly titulo?: { readonly es: string; readonly en?: string };
  readonly descripcion?: { readonly es: string; readonly en?: string };
  readonly precio?: number;
  readonly departamento?: string;
  readonly municipio?: string;
  readonly estrato?: number;
  readonly predial?: string;
  readonly administracion?: string;
  readonly acabados?: { readonly es: string; readonly en?: string };
  readonly antiguedad?: string;
  readonly areaConstruida?: number;
  readonly areaLote?: number;
  readonly dormitorios?: number;
  readonly banos?: number;
  readonly parqueaderos?: number;
  readonly deposito?: number;
  readonly amenidades?: readonly string[];
  readonly puntosInteres?: readonly unknown[];
  readonly fotos?: readonly unknown[];
  readonly videos?: readonly string[];
  readonly panoramas?: readonly unknown[];
  readonly destacada?: boolean;
  readonly proyecto?: {
    readonly etapa?: { readonly es: string; readonly en?: string };
    readonly fechaEntregaEstimada?: string;
    readonly unidadesDisponibles?: number;
  };
}

/** Resultado de crear un inmueble. */
export interface CrearPropertyResult {
  readonly property: PropertyDto;
}

/** Resultado de actualizar un inmueble. */
export interface ActualizarPropertyResult {
  readonly property: PropertyDto;
}

/** Resultado de activar un inmueble. */
export interface ActivarPropertyResult {
  readonly property: PropertyDto;
  readonly primeraActivacion: boolean;
  readonly fechaPublicacion: string;
}

/** Resultado de ocultar un inmueble. */
export interface OcultarPropertyResult {
  readonly property: PropertyDto;
}

/** Resultado de soft delete de un inmueble. */
export interface EliminarPropertyResult {
  readonly property: PropertyDto;
}

/** Puerto de persistencia de inmuebles. Implementado por Firestore. */
export interface PropertiesRepository {
  readonly create: (input: CrearPropertyInputDto) => Promise<CrearPropertyResult>;
  readonly findByIdOrSlug: (
    idOrSlug: string,
    esPublico: boolean,
  ) => Promise<ObtenerPropertyResult | null>;
  readonly listPublico: (filtros: FiltrosListadoPublico) => Promise<ListadoPublicoResult>;
  readonly getFeatured: () => Promise<readonly PropertyCardDto[]>;
  readonly update: (
    idOrSlug: string,
    input: ActualizarPropertyInputDto,
  ) => Promise<ActualizarPropertyResult>;
  readonly activate: (idOrSlug: string) => Promise<ActivarPropertyResult>;
  readonly hide: (idOrSlug: string) => Promise<OcultarPropertyResult>;
  readonly softDelete: (idOrSlug: string) => Promise<EliminarPropertyResult>;
}
