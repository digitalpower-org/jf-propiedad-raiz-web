/**
 * MT1.1 — Tests de lógica pura de health check (BFF + Functions).
 *
 * Ejecutar: npm run test (desde packages/client)
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

// server-only lanza al importarse fuera de Server Component de Next.js.
// En Vitest (entorno Node) se mockea como no-op para que no rompa los tests puros.
vi.mock('server-only', () => ({ default: undefined }));

const originalEnv = process.env.FUNCTIONS_BASE_URL;

// server-config hace Zod parse() en nivel de módulo: requiere BFF_INTERNAL_KEY
// y SESSION_JWT_SECRET definidos ANTES de importar ./health.
beforeAll(() => {
  process.env.BFF_INTERNAL_KEY = 'test-key-with-at-least-32-chars!!!';
  process.env.SESSION_JWT_SECRET = 'test-secret-with-at-least-32-chars!!!';
});

afterAll(() => {
  if (originalEnv !== undefined) {
    process.env.FUNCTIONS_BASE_URL = originalEnv;
  } else {
    delete process.env.FUNCTIONS_BASE_URL;
  }
});

async function importHealth() {
  vi.resetModules();
  return await import('./health');
}

type HealthModule = Awaited<ReturnType<typeof importHealth>>;

describe('health — lógica pura', () => {
  // Mock global de fetch
  const originalFetch = globalThis.fetch;

  let health: HealthModule;

  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn());
    delete process.env.FUNCTIONS_BASE_URL;
    health = await importHealth();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.FUNCTIONS_BASE_URL;
  });

  describe('getFunctionsBaseUrl', () => {
    it('usa default cuando no hay FUNCTIONS_BASE_URL', () => {
      expect(health.getFunctionsBaseUrl()).toBe(
        'http://127.0.0.1:5001/jf-propiedad-raiz/us-central1',
      );
    });

    it('usa FUNCTIONS_BASE_URL cuando existe', async () => {
      process.env.FUNCTIONS_BASE_URL = 'https://custom.example.com/functions';
      health = await importHealth();
      expect(health.getFunctionsBaseUrl()).toBe('https://custom.example.com/functions');
    });
  });

  describe('checkFunctionsHealth', () => {
    const makeResponse = (
      overrides: Partial<{
        ok: boolean;
        status: number;
        json: unknown;
      }> = {},
    ) => ({
      ok: overrides.ok ?? true,
      status: overrides.status ?? 200,
      json: vi.fn().mockResolvedValue(overrides.json ?? { status: 'ok', service: 'functions' }),
    });

    it('resuelve ok con respuesta 200 + status ok', async () => {
      const mockFetch = vi.fn().mockResolvedValue(makeResponse());
      vi.stubGlobal('fetch', mockFetch);

      const result = await health.checkFunctionsHealth();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('functions');
      expect(result.latencyMs).toBeDefined();
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('resuelve error con HTTP 500', async () => {
      const mockFetch = vi.fn().mockResolvedValue(makeResponse({ ok: false, status: 500 }));
      vi.stubGlobal('fetch', mockFetch);

      const result = await health.checkFunctionsHealth();

      expect(result.status).toBe('error');
      expect(result.service).toBe('functions');
      expect(result.latencyMs).toBeDefined();
      expect(result.error).toContain('HTTP 500');
    });

    it('resuelve error con HTTP 200 pero status no ok', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(makeResponse({ json: { status: 'degraded', service: 'functions' } }));
      vi.stubGlobal('fetch', mockFetch);

      const result = await health.checkFunctionsHealth();

      expect(result.status).toBe('error');
      expect(result.error).toContain('Unexpected response');
    });

    it('resuelve error con network error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      vi.stubGlobal('fetch', mockFetch);

      const result = await health.checkFunctionsHealth();

      expect(result.status).toBe('error');
      expect(result.error).toBe('ECONNREFUSED');
    });

    it('resuelve error con timeout (AbortError)', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      const mockFetch = vi.fn().mockRejectedValue(abortError);
      vi.stubGlobal('fetch', mockFetch);

      const result = await health.checkFunctionsHealth();

      expect(result.status).toBe('error');
      expect(result.error).toBe('Timeout');
      expect(result.latencyMs).toBe(5000);
    });

    it('calcula latencyMs correctamente', async () => {
      const mockFetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve(makeResponse()),
              10, // 10ms de retraso simulado
            ),
          ),
      );
      vi.stubGlobal('fetch', mockFetch);

      const result = await health.checkFunctionsHealth();

      expect(result.latencyMs).toBeGreaterThanOrEqual(10);
      expect(result.latencyMs).toBeLessThan(100);
    });
  });

  describe('getHealth', () => {
    const makeResponse = (
      overrides: Partial<{
        ok: boolean;
        status: number;
        json: unknown;
      }> = {},
    ) => ({
      ok: overrides.ok ?? true,
      status: overrides.status ?? 200,
      json: vi.fn().mockResolvedValue(overrides.json ?? { status: 'ok', service: 'functions' }),
    });

    it('retorna overall ok y status 200 cuando functions ok', async () => {
      const mockFetch = vi.fn().mockResolvedValue(makeResponse());
      vi.stubGlobal('fetch', mockFetch);

      const { body, status } = await health.getHealth();

      expect(body.bff).toEqual(health.BFF_HEALTH);
      expect(body.functions.status).toBe('ok');
      expect(body.overall).toBe('ok');
      expect(status).toBe(200);
    });

    it('retorna overall degraded y status 503 cuando functions error', async () => {
      const mockFetch = vi.fn().mockResolvedValue(makeResponse({ ok: false, status: 503 }));
      vi.stubGlobal('fetch', mockFetch);

      const { body, status } = await health.getHealth();

      expect(body.bff).toEqual(health.BFF_HEALTH);
      expect(body.functions.status).toBe('error');
      expect(body.overall).toBe('degraded');
      expect(status).toBe(503);
    });

    it('bff siempre ok', async () => {
      const mockFetch = vi.fn().mockResolvedValue(makeResponse({ ok: false, status: 500 }));
      vi.stubGlobal('fetch', mockFetch);

      const { body } = await health.getHealth();

      expect(body.bff).toEqual({ status: 'ok', service: 'bff' });
    });
  });
});
