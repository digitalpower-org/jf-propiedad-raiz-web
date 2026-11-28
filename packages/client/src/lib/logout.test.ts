import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cerrarSesion } from './logout';

const m = vi.hoisted(() => ({
  pasos: [] as string[],
  signOut: vi.fn(),
  fetch: vi.fn(),
  assign: vi.fn(),
}));
vi.mock('./firebase-client', () => ({
  getFirebaseAuth: () => ({ nombre: 'auth' }),
  signOut: m.signOut,
}));

beforeEach(() => {
  m.pasos.length = 0;
  m.signOut.mockReset().mockImplementation(async () => void m.pasos.push('signOut'));
  m.fetch.mockReset().mockImplementation(async (url: string, init?: RequestInit) => {
    m.pasos.push(`${init?.method} ${url}`);
    return new Response(null, { status: 204 });
  });
  m.assign.mockReset().mockImplementation((url: string) => void m.pasos.push(`ir ${url}`));
  vi.stubGlobal('fetch', m.fetch);
  vi.stubGlobal('window', { location: { assign: m.assign } });
});
afterEach(() => vi.unstubAllGlobals());

describe('cerrarSesion (US1.4)', () => {
  it('cierra Firebase, borra la cookie y va a la portada, en ese orden', async () => {
    await cerrarSesion();
    expect(m.pasos).toEqual(['signOut', 'POST /api/auth/logout', 'ir /']);
    expect(m.signOut).toHaveBeenCalledWith({ nombre: 'auth' });
  });

  it('si falla signOut, igual borra la cookie', async () => {
    m.signOut.mockRejectedValue(new Error('sin red'));
    await expect(cerrarSesion()).rejects.toThrow();
    expect(m.fetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
    expect(m.assign).not.toHaveBeenCalled();
  });

  it('si el BFF no borra la cookie, falla y no navega', async () => {
    m.fetch.mockResolvedValue(new Response(null, { status: 500 }));
    await expect(cerrarSesion()).rejects.toThrow();
    expect(m.assign).not.toHaveBeenCalled();
  });
});
