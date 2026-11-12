import type { RecursoMedia } from '@jf/shared-types';

/**
 * Resultado de presignar una subida a R2 (US1.8).
 */
export interface PresignPutResult {
  readonly url: string;
  readonly key: string;
  readonly expiresInSeconds: number;
}

/**
 * Resultado de confirmar una subida y generar derivados (US1.9).
 */
export interface ConfirmarSubidaResult {
  readonly derivados: readonly { readonly clave: string; readonly ancho: number }[];
}

/**
 * Puerto de almacenamiento de media en Cloudflare R2 (US1.8, US1.9).
 * Implementado por el adaptador R2.
 *
 * No conoce Express, HTTP ni el navegador: solo expone operaciones de negocio.
 */
export interface MediaStorage {
  /**
   * Genera una URL PUT presignada para subir un objeto a `pending/`.
   * Valida el rol de administrador y el tipo MIME antes de firmar.
   */
  readonly presignPut: (nombre: string, mimeType: string) => Promise<PresignPutResult>;

  /**
   * Confirma que un archivo se subió a `pending/`, lo valida por cabecera
   * (tipo → peso → dimensiones mínimas → tope de píxeles → proporción),
   * genera derivados WebP y elimina el original.
   */
  readonly confirmarSubida: (key: string, recurso: RecursoMedia) => Promise<ConfirmarSubidaResult>;
}
