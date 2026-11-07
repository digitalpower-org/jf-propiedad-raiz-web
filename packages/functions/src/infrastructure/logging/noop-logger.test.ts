import { describe, expect, it } from 'vitest';

import { NoopLogger } from './noop-logger';

describe('NoopLogger', () => {
  it('acepta todas las llamadas sin efectos', () => {
    const logger = new NoopLogger();

    expect(() => {
      logger.debug('d', { a: 1 });
      logger.info('i');
      logger.warn('w', { b: 2 });
      logger.error('e', new Error('x'), { c: 3 });
    }).not.toThrow();
  });
});
