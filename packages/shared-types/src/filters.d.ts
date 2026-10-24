/**
 * Presets y combinaciones de filtros soportadas por el listado público (D9, D17, D28).
 * Fuente única: tabla §5 de docs/ARCHITECTURE.md (AC1.10.4); consistente con
 * `firestore.indexes.json` y con `presets.json` en la raíz de este paquete.
 */

import type { Operacion, TipoInmueble } from "./models/common";

/** Identificador de un preset (D28): la base `1` combinada con precio (2), tipo (3) y
 * ubicación (4). */
export type FilterPresetId =
    | "1"
    | "1+2"
    | "1+3"
    | "1+4"
    | "1+2+3"
    | "1+2+4"
    | "1+3+4"
    | "1+2+3+4";

/** Igualdad opcional de un preset (D28). `departamento` y `municipio` siempre van juntos (D24). */
export type FiltroOpcional = "tipo" | "departamento" | "municipio";

/** Campos base fijos de todo listado público (D28): `status = ACTIVE`, la operación de la
 * pestaña y `destacada` con un único valor, nunca ambos. */
export interface FiltroBase {
    readonly status: "ACTIVE";
    readonly operacion: Operacion;
    readonly destacada: boolean;
}

/** Un preset = una fila de la tabla única de combinaciones (§5 de ARCHITECTURE, AC1.10.4). */
export interface FilterPreset {
    readonly preset: FilterPresetId;
    /** Igualdades opcionales activas; vacías solo en el preset `1`. */
    readonly igualdadesOpcionales: readonly FiltroOpcional[];
    /** `true` si el preset filtra por rango `precioMin`/`precioMax` (columna «Rango de precio»). */
    readonly rangoPrecio: boolean;
    /** Índice compuesto exacto de `firestore.indexes.json` para este preset (un preset = un índice). */
    readonly indiceCompuesto: readonly string[];
}

/** Los 8 presets en el orden de la tabla §5; forma del archivo `presets.json` (raíz del paquete). */
export type PresetsFile = readonly FilterPreset[];

/** Parámetros de consulta del listado público (AC1.10.1); la combinación debe ser uno de los
 * 8 presets, si no 422 `VALIDATION_ERROR` (AC1.10.5). `departamento` y `municipio` juntos o
 * ninguno (D24); `destacada` con un solo valor (D28). */
export interface FiltrosListado {
    readonly operacion: Operacion;
    readonly destacada: boolean;
    readonly tipo?: TipoInmueble;
    readonly departamento?: string;
    readonly municipio?: string;
    readonly precioMin?: number;
    readonly precioMax?: number;
}
