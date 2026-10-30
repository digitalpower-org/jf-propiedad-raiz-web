/**
 * Tipos comunes del modelo de datos.
 * Fuente: «MODELO DE DATOS MÍNIMO» de docs/TASKS.md.
 */

/** Campo traducible (MODELO DE DATOS, TASKS): `es` lo escribe el admin; `en` lo escribe el
 * sistema con traducción automática o el admin a mano (US0.5, D22). */
export interface Translatable {
    readonly es: string;
    readonly en?: string;
    /** Lo envía el admin en el DTO de entrada y el backend lo persiste (AC4.1.4, D-A). */
    readonly autoTranslate?: boolean;
    /** Solo lo escribe el backend; regla de estado de AC0.5.11 (Pendiente/Actualizada). */
    readonly enPendiente?: boolean;
}

/** Estados de inmuebles y servicios (D7). Sin `DRAFT` ni estados de disponibilidad. */
export type EstadoPropiedad = "ACTIVE" | "HIDDEN" | "DELETED";

/** Operación de la pestaña (D8). `PROYECTO_SOBRE_PLANOS` añade campos propios (D20). */
export type Operacion = "VENTA" | "ALQUILER" | "PROYECTO_SOBRE_PLANOS";

/** Catálogo cerrado de tipo de inmueble (MODELO DE DATOS, TASKS). */
export type TipoInmueble =
    | "CASA"
    | "APARTAMENTO"
    | "LOTE_CAMPESTRE"
    | "LOTE_URBANO"
    | "FINCA"
    | "LOCAL_COMERCIAL"
    | "BODEGA"
    | "OFICINA";

/** Rol de la sesión resuelto por el backend desde `authorized_users` (AC1.2.7, D27);
 * en la v1 su valor es siempre `admin` (AC1.5.6). */
export type Rol = "admin";

/** Destino de una subida de media: foto o panorámica 360° (AC1.9.1, US4.3.3). */
export type RecursoMedia = "foto" | "panorama";

/** Catálogo cerrado de amenidades (MODELO DE DATOS, TASKS: «p. ej. PISCINA, CANCHA,
 * GIMNASIO»). El catálogo es cerrado; ampliarlo es un cambio aquí. */
export type Amenidad = "PISCINA" | "CANCHA" | "GIMNASIO";

/** Categorías predefinidas de puntos de interés (AC2.4.4). */
export type PuntoInteresCategoria =
    | "EDUCACION"
    | "GIMNASIO"
    | "ZONA_COMERCIAL"
    | "AVENIDA_PRINCIPAL"
    | "TRANSPORTE_PUBLICO"
    | "SALUD";

/** Punto de interés de categoría predefinida, con etiqueta opcional. */
export interface PuntoInteresPredefinido {
    readonly categoria: PuntoInteresCategoria;
    readonly etiqueta?: Translatable;
}

/** Punto de interés personalizado: solo su etiqueta traducible. */
export interface PuntoInteresPersonalizado {
    readonly categoria?: never;
    readonly etiqueta: Translatable;
}

/** Punto de interés: categoría predefinida o ítem personalizado (MODELO DE DATOS, TASKS). */
export type PuntoInteres = PuntoInteresPredefinido | PuntoInteresPersonalizado;

/** Derivado WebP generado solo en el backend (US1.9); `ancho` es el lado mayor en px. */
export interface DerivadoImagen {
    readonly ancho: number;
    readonly clave: string;
}

/** Foto de galería: el orden es la posición en el arreglo; posición 1 = portada (US4.2.1).
 * Cada foto conserva las claves de sus derivados (MODELO DE DATOS, TASKS). */
export interface Foto {
    readonly derivados: readonly DerivadoImagen[];
}

/** Panorámica 360° (JPG en R2, máximo 3 por inmueble, D21/D14). */
export interface Panorama {
    readonly derivados: readonly DerivadoImagen[];
}

/** Enlace de YouTube (D13); no se suben archivos de video (AC4.3.6). */
export type VideoYouTube = string;
