/**
 * Logger (US0.5, AC0.5.5)
 *
 * Puerto de logging mínimo para el caso de uso de traducción.
 * No depende de firebase-functions; se inyecta para testabilidad.
 */

export interface Logger {
  readonly requestId: string;
  warn(event: string, context?: Record<string, unknown>): void;
  error(event: string, context?: Record<string, unknown>): void;
  info(event: string, context?: Record<string, unknown>): void;
}

/** Logger que no hace nada (usado en tests). */
export class NoopLogger implements Logger {
  readonly requestId = 'noop';
  warn(_event: string, _context?: Record<string, unknown>): void {}
  error(_event: string, _context?: Record<string, unknown>): void {}
  info(_event: string, _context?: Record<string, unknown>): void {}
}
