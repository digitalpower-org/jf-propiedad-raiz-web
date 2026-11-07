import { describe, expect, it, vi } from 'vitest';

import { createCloudLogger } from './cloud-logger';

const mocks = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('firebase-functions/logger', () => ({ logger: mocks }));

describe('createCloudLogger', () => {
  it('delega debug/info/warn con metadatos vacíos por defecto', () => {
    const logger = createCloudLogger();

    logger.debug('debug_event');
    logger.info('info_event', { a: 1 });
    logger.warn('warn_event');

    expect(mocks.debug).toHaveBeenCalledWith('debug_event', {});
    expect(mocks.info).toHaveBeenCalledWith('info_event', { a: 1 });
    expect(mocks.warn).toHaveBeenCalledWith('warn_event', {});
  });

  it('serializa errores y fusiona metadatos', () => {
    const logger = createCloudLogger();
    const error = new Error('boom');

    logger.error('failed', error, { requestId: 'req-1' });

    expect(mocks.error).toHaveBeenCalledWith('failed', {
      requestId: 'req-1',
      error: { name: 'Error', message: 'boom', stack: error.stack },
    });
  });

  it('deja pasar valores que no son Error', () => {
    const logger = createCloudLogger();

    logger.error('failed', 'raw-error');

    expect(mocks.error).toHaveBeenCalledWith('failed', { error: 'raw-error' });
  });
});
