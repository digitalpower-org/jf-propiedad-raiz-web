/**
 * US1.5 - Test básico de single-flight renovación (AC1.5.4)
 */
import { describe, it, expect, vi } from 'vitest';

describe('auth-renew', () => {
  it('debe exportar renewSessionSingleFlight', () => {
    const mod = require('./auth-renew');
    expect(typeof mod.renewSessionSingleFlight).toBe('function');
  });

  it('debe evitar llamadas concurrentes (single-flight)', async () => {
    const { renewSessionSingleFlight } = await import('./auth-renew');
    // AC1.5.4: la segunda llamada debe esperar la primera
    const p1 = renewSessionSingleFlight();
    const p2 = renewSessionSingleFlight();
    expect(p1).toBe(p2); // mis.de referencia, no duplicado
  });
});
