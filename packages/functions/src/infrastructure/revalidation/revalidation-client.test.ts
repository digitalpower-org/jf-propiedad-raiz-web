import { describe, expect, it, vi } from 'vitest';

import { createRevalidationClient } from './revalidation-client';
import { NoopLogger } from '../../infrastructure/logging/logger';

describe('RevalidationClient (MT1.4)', () => {
  const makeClient = (
    overrides?: Partial<{ bffUrl: string; internalKey: string; timeoutMs: number }>,
  ) => {
    const config = {
      bffUrl: overrides?.bffUrl ?? 'https://example.web.app',
      internalKey: overrides?.internalKey ?? 'test-internal-key',
      timeoutMs: overrides?.timeoutMs ?? 5_000,
    };
    const logger = new NoopLogger();
    return createRevalidationClient({ ...config, logger });
  };

  describe('revalidate', () => {
    it('acepta request vacío y retorna ok', async () => {
      const client = makeClient();
      const result = await client.revalidate({});
      expect(result.ok).toBe(true);
    });

    it('revalida rutas y etiquetas vía fetch al BFF', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { revalidated: 3, failed: 0, errors: [] } }),
      });

      const globalFetch = globalThis.fetch as typeof fetch;
      globalThis.fetch = fetchMock as never;

      try {
        const client = makeClient();
        const result = await client.revalidate({
          paths: ['/es/inmuebles/casa-1', '/en/inmuebles/apartamento-1'],
          tags: ['propiedades'],
        });
        expect(result.ok).toBe(true);
        expect(fetchMock).toHaveBeenCalledTimes(1);

        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://example.web.app/api/revalidate');
        const headers = init?.headers as unknown as Record<string, string>;
        expect(headers['X-Internal-Key']).toBe('test-internal-key');
        expect(init?.method).toBe('POST');
        expect(init?.body).toContain('paths');
        expect(init?.body).toContain('tags');
      } finally {
        globalThis.fetch = globalFetch;
      }
    });

    it('retorna ok: false en error de red (500)', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { code: 'INTERNAL', message: 'BFF error' } }),
      });

      const globalFetch = globalThis.fetch as typeof fetch;
      globalThis.fetch = fetchMock as never;

      try {
        const client = makeClient();
        const result = await client.revalidate({
          paths: ['/es/test'],
        });
        expect(result.ok).toBe(false);
      } finally {
        globalThis.fetch = globalFetch;
      }
    });

    it('retorna ok: false en error 401 (clave inválida)', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { code: 'UNAUTHORIZED', message: 'Invalid key' } }),
      });

      const globalFetch = globalThis.fetch as typeof fetch;
      globalThis.fetch = fetchMock as never;

      try {
        const client = makeClient();
        const result = await client.revalidate({ paths: ['/es/test'] });
        expect(result.ok).toBe(false);
      } finally {
        globalThis.fetch = globalFetch;
      }
    });

    it('usa timeout configurado', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('AbortError'));

      const globalFetch = globalThis.fetch as typeof fetch;
      globalThis.fetch = fetchMock as never;

      try {
        const client = makeClient({ timeoutMs: 100 });
        await client.revalidate({ paths: ['/es/test'] });
        expect(fetchMock).toHaveBeenCalledTimes(1);
      } finally {
        globalThis.fetch = globalFetch;
      }
    });

    it('normaliza URL sin barra al final', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { revalidated: 1, failed: 0, errors: [] } }),
      });

      const globalFetch = globalThis.fetch as typeof fetch;
      globalThis.fetch = fetchMock as never;

      try {
        const client = makeClient({ bffUrl: 'https://example.web.app/' });
        const result = await client.revalidate({ paths: ['/es/test'] });
        expect(result.ok).toBe(true);

        const [url] = fetchMock.mock.calls[0] as [string];
        expect(url).toBe('https://example.web.app/api/revalidate');
      } finally {
        globalThis.fetch = globalFetch;
      }
    });
  });
});
