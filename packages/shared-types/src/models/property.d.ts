/**
 * Modelo `Property` (inmueble) y sus proyecciones públicas.
 * Fuente: «MODELO DE DATOS MÍNIMO» de docs/TASKS.md; proyecciones de AC7.4.1.
 */

import type {
    Amenidad,
    DerivadoImagen,
    EstadoPropiedad,
    Foto,
    Operacion,
    Panorama,
    PuntoInteres,
    TipoInmueble,
    Translatable,
    VideoYouTube,
} from "./common";

/** Campos propios de un proyecto sobre planos (D20, AC2.4.3, AC4.1.5). */
export interface Proyecto {
    readonly etapa: Translatable;
    /** Mes y año de entrega en formato `AAAA-MM`. */
    readonly fechaEntregaEstimada?: string;
    readonly unidadesDisponibles?: number;
}

/** Inmueble completo persistido en Firestore (MODELO DE DATOS, TASKS). */
export interface Property {
    readonly id: string;
    /** Código secuencial `JF-XXXX`, asignado al crear (D6); de solo lectura (AC1.7.2). */
    readonly codigo: string;
    /** Generado del título en español + código; mismo slug en ambos idiomas (AC0.4.7). */
    readonly slug: string;
    readonly status: EstadoPropiedad;
    readonly operacion: Operacion;
    readonly tipo: TipoInmueble;
    readonly titulo: Translatable;
    /** Traducible; cualquier mención de sector o barrio va aquí como texto libre (D24). */
    readonly descripcion: Translatable;
    /** COP entero; valor de venta o canon mensual, sin decimales (AC0.4.8, AC1.7.4). */
    readonly precio: number;
    readonly departamento: string;
    readonly municipio: string;
    readonly estrato?: number;
    readonly predial?: string;
    readonly administracion?: string;
    readonly acabados?: Translatable;
    readonly antiguedad?: string;
    readonly areaConstruida?: number;
    readonly areaLote?: number;
    readonly dormitorios?: number;
    readonly banos?: number;
    readonly parqueaderos?: number;
    /** Cuarto útil (MODELO DE DATOS, TASKS). */
    readonly deposito?: number;
    readonly amenidades?: readonly Amenidad[];
    readonly puntosInteres?: readonly PuntoInteres[];
    /** Orden = posición; posición 1 = portada (US4.2.1, US4.2.3). */
    readonly fotos?: readonly Foto[];
    /** Máximo 2 URLs de YouTube (MODELO DE DATOS, D13, AC4.3.1). */
    readonly videos?: readonly [VideoYouTube?, VideoYouTube?];
    /** Máximo 3 panorámicas 360° (D21, AC4.3.3). */
    readonly panoramas?: readonly [Panorama?, Panorama?, Panorama?];
    readonly destacada: boolean;
    readonly proyecto?: Proyecto;
    /** Se fija solo en la primera activación (AC1.7.5); de solo lectura (AC1.7.2). */
    readonly fechaPublicacion?: string;
    /** De solo lectura en la API y en el editor (AC1.7.2). */
    readonly createdAt: string;
    /** De solo lectura; control de concurrencia optimista contra 409 (AC1.7.2, AC1.7.8). */
    readonly updatedAt: string;
}

/** Tarjeta de listado (AC7.4.1, US7.4): `Property` sin `descripcion`, sin `puntosInteres` y
 * sin la lista completa de fotos; el listado responde solo tarjetas (AC1.10.7, AC7.4.11). */
export interface PropertyCard {
    readonly id: string;
    readonly codigo: string;
    readonly slug: string;
    readonly operacion: Operacion;
    readonly tipo: TipoInmueble;
    readonly titulo: Translatable;
    readonly precio: number;
    readonly departamento: string;
    readonly municipio: string;
    readonly estrato?: number;
    readonly dormitorios?: number;
    readonly banos?: number;
    readonly areaConstruida?: number;
    /** Derivados WebP de la foto de portada (posición 1) para el `srcset` (AC7.3.1). */
    readonly portada?: readonly DerivadoImagen[];
    readonly destacada: boolean;
    readonly createdAt: string;
}

/** Ficha pública del inmueble (AC7.4.1, US2.4). El modelo `Property` solo contiene campos
 * públicos o de edición; los campos internos del backend no viven aquí (AC1.10.7). */
export type PropertyDetail = Property;
