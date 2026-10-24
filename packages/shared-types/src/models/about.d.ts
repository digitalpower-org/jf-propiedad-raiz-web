/**
 * Modelo `About` (página Nosotros, documento único `pages/nosotros` — D25, US4.5).
 * Fuente: «MODELO DE DATOS MÍNIMO» de docs/TASKS.md.
 */

import type { Foto, Translatable } from "./common";

/** Sección libre de la página (visión, misión, historia…); orden = posición (US4.5.1). */
export interface AboutSeccion {
    readonly id: string;
    readonly titulo: Translatable;
    readonly cuerpo: Translatable;
}

/** Integrante del equipo; orden = posición (US4.5.1). */
export interface IntegranteEquipo {
    readonly id: string;
    /** No se traduce (US0.5, «No se traducen»). */
    readonly nombre: string;
    readonly cargo: Translatable;
    readonly descripcion?: Translatable;
    /** Una sola foto por integrante, con el flujo de US1.8/US1.9 (US4.5.2). */
    readonly foto?: Foto;
}

/** Documento único de la página Nosotros (D25, US4.5). */
export interface About {
    readonly titulo: Translatable;
    /** Extracto mostrado en la portada (AC2.6.4); máximo 500 caracteres (AC4.5.3). */
    readonly extracto: Translatable;
    readonly secciones: readonly AboutSeccion[];
    readonly equipo: readonly IntegranteEquipo[];
    /** De solo lectura; control de concurrencia optimista contra 409 (AC4.5.5). */
    readonly updatedAt: string;
}
