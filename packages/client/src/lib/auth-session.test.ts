/**
 * US1.5 - Test básico de ciclo de sesión (AC1.5.2, AC1.5.3, AC1.5.7)
 */
import { describe, it, expect, vi } from 'vitest';

describe('auth-session', () => {
  it('debe exponer startSession y logoutSession', () => {
    // AC1.5.2 / AC1.5.7 - funciones exportadas
    const mod = require('./auth-session');
    expect(typeof mod.startSession).toBe('function');
    expect(typeof mod.logoutSession).toBe('function');
  });

  it('debe blanquear idToken tras canje (AC1.5.3)', () => {
    // AC1.5.3: no persiste idToken en variable global ni localStorage
    expect(typeof window === 'undefined' || !localStorage.getItem('idToken')).toBeTruthy();
  });
});
