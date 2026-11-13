import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/server/backend-url', () => ({
  backendUrl: (p: string) => `http://backend.test${p}`,
}));
vi.mock('@/server/config/server-config', () => ({ env: { BFF_INTERNAL_KEY: 'key-test' } }));

import { fetchServicesPreviewServer } from './services-preview';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const svc = (slug: unknown, orden: unknown, extra: Record<string, unknown> = {}) => ({
  slug,
  orden,
  status: 'ACTIVE',
  titulo: { es: `T ${String(slug)}`, en: `E ${String(slug)}` },
  ...extra,
});

const ok = (items: unknown[]) => reply(200, { success: true, data: { items } });

describe('fetchServicesPreviewServer', () => {
  it('ordena por orden, deja solo 3 y llama con la llave interna', async () => {
    fetchMock.mockResolvedValue(ok([svc('d', 4), svc('b', 2), svc('a', 1), svc('c', 3)]));

    const result = await fetchServicesPreviewServer();

    expect(result.map((s) => s.slug)).toEqual(['a', 'b', 'c']);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://backend.test/api/v1/services');
    expect((init.headers as Record<string, string>)['X-Internal-Key']).toBe('key-test');
    expect(init.cache).toBe('no-store');
  });

  it('descarta los servicios sin slug utilizable', async () => {
    fetchMock.mockResolvedValue(ok([svc(undefined, 1), svc('', 2), svc('   ', 3), svc('ok', 4)]));

    const result = await fetchServicesPreviewServer();

    expect(result.map((s) => s.slug)).toEqual(['ok']);
  });

  it('descarta los servicios que no están ACTIVE', async () => {
    fetchMock.mockResolvedValue(ok([svc('oculto', 1, { status: 'HIDDEN' }), svc('visible', 2)]));

    const result = await fetchServicesPreviewServer();

    expect(result.map((s) => s.slug)).toEqual(['visible']);
  });

  it('descarta los servicios sin título o sin orden', async () => {
    fetchMock.mockResolvedValue(
      ok([
        svc('sin-orden', undefined),
        { slug: 'sin-titulo', orden: 1, status: 'ACTIVE' },
        svc('bien', 3),
      ]),
    );

    const result = await fetchServicesPreviewServer();

    expect(result.map((s) => s.slug)).toEqual(['bien']);
  });

  it('conserva el resumen cuando viene', async () => {
    fetchMock.mockResolvedValue(ok([svc('a', 1, { resumen: { es: 'resumen' } })]));

    const result = await fetchServicesPreviewServer();

    expect(result[0]?.resumen).toEqual({ es: 'resumen' });
  });

  it('lanza si el backend responde con error', async () => {
    fetchMock.mockResolvedValue(reply(500, { success: false }));

    await expect(fetchServicesPreviewServer()).rejects.toThrow(/500/);
  });

  it('lanza si la respuesta no tiene la forma esperada', async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { success: false, data: { items: [svc('a', 1)] } }));
    await expect(fetchServicesPreviewServer()).rejects.toThrow(/inesperada/);

    fetchMock.mockResolvedValueOnce(reply(200, { success: true, data: { items: 'x' } }));
    await expect(fetchServicesPreviewServer()).rejects.toThrow(/inesperada/);
  });
});
