/**
 * Puerto de logging (B8).
 *
 * Application y Domain nunca importan `firebase-functions`: reciben esta
 * interfaz inyectada. El adaptador real vive en `infrastructure/logging`.
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: unknown, meta?: Record<string, unknown>): void;
}
