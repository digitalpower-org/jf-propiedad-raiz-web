/**
 * Tests de `backend-url`: la URL final del backend debe incluir SIEMPRE el
 * nombre de la función exportada (`internalAuth`, `api`, `health`).
 */

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({ default: undefined }));

const originalEnv = process.env.FUNCTIONS_BASE_URL;

beforeAll(() => {
  process.env.BFF_INTERNAL_KEY = 'test-key-with-at-least-32-chars!!!';
  process.env.SESSION_JWT_SECRET = 'test-secret-with-at-least-32-chars!!!';
  process.env.SESSION_JWT_SECRET_PREVIOUS = '';
});

afterEach(() => {
  vi.resetModules();
});

afterAll(() => {
  if (originalEnv !== undefined) {
    process.env.FUNCTIONS_BASE_URL = originalEnv;
  } else {
    delete process.env.FUNCTIONS_BASE_URL;
  }
});

async function importBackendUrl(base: string) {
  process.env.FUNCTIONS_BASE_URL = base;
  vi.resetModules();
  return await import('./backend-url');
}

describe('backendUrl', () => {
  it('incluye internalAuth y normaliza la base sin barra final', async () => {
    const { backendUrl } = await importBackendUrl('https://functions.test');

    expect(backendUrl('/internal/auth/verify')).toBe(
      'https://functions.test/internalAuth/internal/auth/verify',
    );
  });

  it('incluye internalAuth y normaliza la base con barra final', async () => {
    const { backendUrl } = await importBackendUrl('https://functions.test/');

    expect(backendUrl('/internal/auth/verify')).toBe(
      'https://functions.test/internalAuth/internal/auth/verify',
    );
  });

  it('incluye la función api para el prefijo /api/v1/', async () => {
    const { backendUrl } = await importBackendUrl('https://functions.test');

    expect(backendUrl('/api/v1/properties')).toBe('https://functions.test/api/api/v1/properties');
  });

  it('lanza un error descriptivo para un prefijo desconocido', async () => {
    const { backendUrl } = await importBackendUrl('https://functions.test');

    expect(() => backendUrl('/desconocido/recurso')).toThrowError(
      /No hay función de Cloud Functions asociada/,
    );
  });
});

describe('backendUrlForFunction', () => {
  it('construye la URL de la función health', async () => {
    const { backendUrlForFunction } = await importBackendUrl('https://functions.test');

    expect(backendUrlForFunction('health')).toBe('https://functions.test/health');
  });

  it('acepta un subPath y normaliza barras', async () => {
    const { backendUrlForFunction } = await importBackendUrl('https://functions.test/');

    expect(backendUrlForFunction('internalAuth', '/internal/auth/verify')).toBe(
      'https://functions.test/internalAuth/internal/auth/verify',
    );
  });
});
