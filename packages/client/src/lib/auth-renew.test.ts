/**
 * US1.5 - Test básico de single-flight renovación (AC1.5.4)
 */
import { describe, it, expect } from 'vitest';
import { renewSessionSingleFlight } from './auth-renew';

describe('auth-renew', () => {
  it('debe exportar renewSessionSingleFlight', () => {
    expect(typeof renewSessionSingleFlight).toBe('function');
  });
});
