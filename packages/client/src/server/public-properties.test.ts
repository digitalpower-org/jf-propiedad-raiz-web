/**
 * Tests de `fetchAllPublicProperties`: recorre las 6 combinaciones
 * operacion × destacada y sigue el cursor hasta agotarlo.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({ default: undefined }));

const BASE = 'http://127.0.0.1:5001/jf-propiedad-raiz/us-central1';
const KEY = 'test-key-with-at-least-32-chars!!!';
const fetchMock = vi.fn<typeof fetch>();

const card = (slug: string) => ({ id: slug, slug, titulo: { es: slug, en: slug } });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function load() {
  vi.resetModules();
  return import('./public-properties');
}

beforeAll(() => {
  process.env.BFF_INTERNAL_KEY = KEY;
  process.env.SESSION_JWT_SECRET = 'test-secret-with-at-least-32-chars!!!';
  process.env.SESSION_JWT_SECRET_PREVIOUS = '';
  process.env.FUNCTIONS_BASE_URL = BASE;
});

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchAllPublicProperties', () => {
  it('recorre las 6 combinaciones y sigue el cursor entre páginas', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = new URL(String(input));
      const p = url.searchParams;
      const venta = p.get('operacion') === 'VENTA' && p.get('destacada') === 'false';
      if (venta && !p.get('cursor')) {
        return jsonResponse({
          success: true,
          data: { items: [card('a'), card('b')], nextCursor: 'c1' },
        });
      }
      if (venta && p.get('cursor') === 'c1') {
        return jsonResponse({ success: true, data: { items: [card('c')], nextCursor: null } });
      }
      return jsonResponse({ success: true, data: { items: [], nextCursor: null } });
    });
    const { fetchAllPublicProperties } = await load();

    const result = await fetchAllPublicProperties();

    expect(result.map((p) => p.slug)).toEqual(['a', 'b', 'c']);
    expect(fetchMock).toHaveBeenCalledTimes(7);
    const urls = fetchMock.mock.calls.map((c) => new URL(String(c[0])));
    for (const u of urls) {
      expect(u.searchParams.get('limit')).toBe('50');
      expect(u.searchParams.get('operacion')).toBeTruthy();
      expect(u.searchParams.get('destacada')).toMatch(/^(true|false)$/);
    }
    const combos = new Set(
      urls.map((u) => `${u.searchParams.get('operacion')}|${u.searchParams.get('destacada')}`),
    );
    expect(combos.size).toBe(6);
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('X-Internal-Key')).toBe(KEY);
  });

  it('lanza error si el backend responde un fallo', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false }, 422));
    const { fetchAllPublicProperties } = await load();

    await expect(fetchAllPublicProperties()).rejects.toThrow('422');
  });

  it('se detiene en el tope de páginas si el cursor nunca se agota', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse({ success: true, data: { items: [], nextCursor: 'siempre' } }),
    );
    const { fetchAllPublicProperties, MAX_PAGES } = await load();

    await fetchAllPublicProperties();

    expect(fetchMock).toHaveBeenCalledTimes(6 * MAX_PAGES);
  });
});
