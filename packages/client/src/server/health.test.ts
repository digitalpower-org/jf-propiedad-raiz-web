/**
 * MT1.1 — Tests de lógica pura de health check (BFF + Functions).
 *
 * Ejecutar: npm run test (desde packages/client)
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

import {
  getFunctionsBaseUrl,
  checkFunctionsHealth,
  getHealth,
  BFF_HEALTH,
  type ServiceHealth,
  type HealthResponse,
} from './health';

const originalEnv = process.env.FUNCTIONS_BASE_URL;

describe('health — lógica pura', () => {
  // Mock global de fetch
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.resetModules();
    delete process.env.FUNCTIONS_BASE_URL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(() => {
    process.env.FUNCTIONS_BASE_URL = originalEnv;
  });

  describe('getFunctionsBaseUrl', () => {
    it('usa default cuando no hay FUNCTIONS_BASE_URL', () => {
      expect(getFunctionsBaseUrl()).toBe('http://127.0.0.1:5001/jf-propiedad-raiz/us-central1');
    });

    it('usa FUNCTIONS_BASE_URL cuando existe', () => {
      process.env.FUNCTIONS_BASE_URL = 'https://custom.example.com/functions';
      expect(getFunctionsBaseUrl()).toBe('https://custom.example.com/functions');
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

      const result = await checkFunctionsHealth();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('functions');
      expect(result.latencyMs).toBeDefined();
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('resuelve error con HTTP 500', async () => {
      const mockFetch = vi.fn().mockResolvedValue(makeResponse({ ok: false, status: 500 }));
      vi.stubGlobal('fetch', mockFetch);

      const result = await checkFunctionsHealth();

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

      const result = await checkFunctionsHealth();

      expect(result.status).toBe('error');
      expect(result.error).toContain('Unexpected response');
    });

    it('resuelve error con network error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      vi.stubGlobal('fetch', mockFetch);

      const result = await checkFunctionsHealth();

      expect(result.status).toBe('error');
      expect(result.error).toBe('ECONNREFUSED');
    });

    it('resuelve error con timeout (AbortError)', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      const mockFetch = vi.fn().mockRejectedValue(abortError);
      vi.stubGlobal('fetch', mockFetch);

      const result = await checkFunctionsHealth();

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

      const result = await checkFunctionsHealth();

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

      const { body, status } = await getHealth();

      expect(body.bff).toEqual(BFF_HEALTH);
      expect(body.functions.status).toBe('ok');
      expect(body.overall).toBe('ok');
      expect(status).toBe(200);
    });

    it('retorna overall degraded y status 503 cuando functions error', async () => {
      const mockFetch = vi.fn().mockResolvedValue(makeResponse({ ok: false, status: 503 }));
      vi.stubGlobal('fetch', mockFetch);

      const { body, status } = await getHealth();

      expect(body.bff).toEqual(BFF_HEALTH);
      expect(body.functions.status).toBe('error');
      expect(body.overall).toBe('degraded');
      expect(status).toBe(503);
    });

    it('bff siempre ok', async () => {
      const mockFetch = vi.fn().mockResolvedValue(makeResponse({ ok: false, status: 500 }));
      vi.stubGlobal('fetch', mockFetch);

      const { body } = await getHealth();

      expect(body.bff).toEqual({ status: 'ok', service: 'bff' });
    });
  });
});
