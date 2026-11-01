import { describe, expect, it } from 'vitest';
import { NoopLogger, type Logger } from './logger';

describe('NoopLogger', () => {
  it('expone un requestId fijo', () => {
    expect(new NoopLogger().requestId).toBe('noop');
  });

  it('warn es invocable, no lanza y no devuelve valor', () => {
    const logger = new NoopLogger();

    expect(() => logger.warn('event.without_context')).not.toThrow();
    expect(logger.warn('event.without_context')).toBeUndefined();

    expect(() => logger.warn('event.with_context', { key: 'value' })).not.toThrow();
    expect(logger.warn('event.with_context', { key: 'value' })).toBeUndefined();
  });

  it('error es invocable, no lanza y no devuelve valor', () => {
    const logger = new NoopLogger();

    expect(() => logger.error('event.without_context')).not.toThrow();
    expect(logger.error('event.without_context')).toBeUndefined();

    expect(() => logger.error('event.with_context', { code: 500 })).not.toThrow();
    expect(logger.error('event.with_context', { code: 500 })).toBeUndefined();
  });

  it('info es invocable, no lanza y no devuelve valor', () => {
    const logger = new NoopLogger();

    expect(() => logger.info('event.without_context')).not.toThrow();
    expect(logger.info('event.without_context')).toBeUndefined();

    expect(() => logger.info('event.with_context', { ok: true })).not.toThrow();
    expect(logger.info('event.with_context', { ok: true })).toBeUndefined();
  });

  it('satisface el contrato Logger', () => {
    const logger: Logger = new NoopLogger();

    expect(logger.requestId).toBe('noop');
    expect(logger.warn('contract')).toBeUndefined();
    expect(logger.error('contract')).toBeUndefined();
    expect(logger.info('contract')).toBeUndefined();
  });
});
