import type { Logger } from '../../application/ports/logger';

/** Logger silencioso para tests y composiciones sin observabilidad. */
export class NoopLogger implements Logger {
  debug(_message: string, _meta?: Record<string, unknown>): void {}
  info(_message: string, _meta?: Record<string, unknown>): void {}
  warn(_message: string, _meta?: Record<string, unknown>): void {}
  error(_message: string, _error?: unknown, _meta?: Record<string, unknown>): void {}
}
