import type { ErrorCode } from './errorCatalog';

/**
 * Error de negocio del backend.
 *
 * No conoce HTTP, Express ni el envelope: Presentation decide el estado y la
 * forma de la respuesta. `details` es opcional y no se asigna cuando es
 * `undefined` (`exactOptionalPropertyTypes`).
 */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}
