import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/server/backend-url', () => ({
  backendUrl: (p: string) => `http://backend.test${p}`,
}));
vi.mock('@/server/config/server-config', () => ({ env: { BFF_INTERNAL_KEY: 'key-test' } }));

import { fetchFeaturedPropertiesServer } from './featured-properties';

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

describe('fetchFeaturedPropertiesServer', () => {
  it('devuelve el arreglo de data y llama al endpoint con la llave interna', async () => {
    const cards = [
      { id: 'a', slug: 'casa-a' },
      { id: 'b', slug: 'casa-b' },
    ];
    fetchMock.mockResolvedValue(reply(200, { success: true, data: cards }));

    const result = await fetchFeaturedPropertiesServer();

    expect(result).toEqual(cards);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://backend.test/api/v1/properties/featured');
    expect((init.headers as Record<string, string>)['X-Internal-Key']).toBe('key-test');
    expect(init.cache).toBe('no-store');
  });

  it('devuelve [] cuando no hay destacadas', async () => {
    fetchMock.mockResolvedValue(reply(200, { success: true, data: [] }));
    expect(await fetchFeaturedPropertiesServer()).toEqual([]);
  });

  it('lanza si el backend responde error', async () => {
    fetchMock.mockResolvedValue(reply(500, { success: false }));
    await expect(fetchFeaturedPropertiesServer()).rejects.toThrow('500');
  });

  it('lanza si data no es un arreglo (forma { items } del listado)', async () => {
    fetchMock.mockResolvedValue(reply(200, { success: true, data: { items: [] } }));
    await expect(fetchFeaturedPropertiesServer()).rejects.toThrow('inesperada');
  });

  it('lanza si success es false aunque data sea un arreglo', async () => {
    fetchMock.mockResolvedValue(reply(200, { success: false, data: [] }));
    await expect(fetchFeaturedPropertiesServer()).rejects.toThrow('inesperada');
  });
});
