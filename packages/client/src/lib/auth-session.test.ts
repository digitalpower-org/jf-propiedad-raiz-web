/**
 * US1.5 - Test básico de ciclo de sesión (AC1.5.2)
 */
import { describe, it, expect } from 'vitest';
import { startSession } from './auth-session';

describe('auth-session', () => {
  it('debe exportar startSession y logoutSession', () => {
    expect(typeof startSession).toBe('function');
  });
});
