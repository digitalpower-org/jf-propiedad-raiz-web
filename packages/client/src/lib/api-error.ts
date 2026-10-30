/**
 * ApiError — error estándar del cliente (TASKS.md AC0.1.1-AC0.1.3)
 * Nunca muestra mensaje técnico al usuario final (AC5.4.11 [Debe NOT]).
 */
export class ApiError extends Error {
  code: string;

  details?: Record<string, string[]> | undefined;
  requestId?: string | undefined;
  status?: number | undefined;

  constructor({
    code,
    message,
    details,
    requestId,
    status,
  }: {
    code: string;
    message: string;
    details?: Record<string, string[]> | undefined;
    requestId?: string | undefined;
    status?: number | undefined;
  }) {
    super(message);
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.status = status;
    this.name = 'ApiError';
  }
}
