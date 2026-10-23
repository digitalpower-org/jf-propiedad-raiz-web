/**
 * `@jf/shared-types` — contratos compartidos del monorepo.
 * Paquete de solo tipos (archivos `.d.ts`); no es un paquete de runtime.
 * El helper de runtime `buildWhatsAppUrl` vive en `packages/client/src/lib/whatsapp.ts` (D35).
 * Contratos API: `docs/openapi.backend.yaml` (interna) y `docs/openapi.bff.yaml` (pública), D26.
 */

export * from "./errors";
export * from "./filters";
export * from "./models";

import type * as BackendSpec from "./api/backend.gen";
import type * as BffSpec from "./api/bff.gen";

/** Tipos generados de la spec interna BFF ↔ Functions (docs/openapi.backend.yaml, D26). */
export type { BackendSpec };
/** Tipos generados de la spec pública navegador ↔ BFF (docs/openapi.bff.yaml, D26). */
export type { BffSpec };
