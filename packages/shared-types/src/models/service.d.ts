/**
 * Modelo `Service` (servicios de ingeniería y arquitectura).
 * Fuente: «MODELO DE DATOS MÍNIMO» de docs/TASKS.md; US4.4, US5.1.
 */

import type { EstadoPropiedad, Foto, Translatable } from "./common";

/** Servicio editable desde el panel, sin cantidad fija (D10, US4.4). */
export interface Service {
    readonly id: string;
    /** Generado del título; único (AC4.4.1, AC0.4.7). */
    readonly slug: string;
    readonly status: EstadoPropiedad;
    readonly titulo: Translatable;
    readonly resumen: Translatable;
    /** Texto plano con párrafos, sin HTML (AC4.4.7, AC4.5.7). */
    readonly cuerpo: Translatable;
    /** Galería de obras: mismo flujo de fotos de los inmuebles (AC4.4.6). */
    readonly fotos?: readonly Foto[];
    /** Define el orden público del índice (AC4.4.3). */
    readonly orden: number;
    readonly updatedAt: string;
}
