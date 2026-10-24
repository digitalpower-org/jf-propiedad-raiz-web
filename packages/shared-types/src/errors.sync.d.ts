/**
 * Sincronización entre el catálogo **runtime** (`packages/shared-types/errors.json`)
 * y la unión de tipos de `./errors.d.ts` (AC0.1.3).
 *
 * Este archivo no se reexporta desde `./index.d.ts` a propósito: la comprobación
 * pertenece al paquete `@jf/shared-types` y no debe arrastrarse al grafo de tipos
 * de `functions` (que consume `shared-types` por `paths`, sin dependencia npm).
 *
 * `@jf/shared-types` lo compila con su propio `tsc --noEmit`
 * (`npm run typecheck -w @jf/shared-types`), de modo que **añadir o quitar un
 * código de error en solo uno de los dos archivos rompe la compilación**.
 *
 * La paridad de los **estados HTTP** no se puede expresar con tipos (TypeScript
 * amplía los números de un módulo JSON a `number`); la comprueba
 * `npm run check:errors`, que falla el build si divergen.
 */

import runtimeCatalog from "../errors.json";
import type { ErrorCode } from "./errors";

/** Catálogo runtime tal como lo ve el compilador: código → estado HTTP. */
type RuntimeCatalog = typeof runtimeCatalog;

/** Códigos declarados en el catálogo runtime. */
type RuntimeCodes = keyof RuntimeCatalog;

/** `true` solo si `A` y `B` son el mismo conjunto de tipos. */
type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** Falla la compilación si la condición es `false`. */
type Assert<T extends true> = T;

/**
 * Falla la compilación si `errors.json` y `errors.d.ts` no declaran exactamente
 * los mismos códigos de error.
 */
export type ErrorCatalogCodesInSync = Assert<MutuallyAssignable<RuntimeCodes, ErrorCode>>;
