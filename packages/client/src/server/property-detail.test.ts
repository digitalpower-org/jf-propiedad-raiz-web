/**
 * Tests de `fetchPropertyDetailServer`: la ficha se lee del backend directo
 * (no por rutas relativas) y distingue 404 (null) de fallos reales (error).
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({ default: undefined }));

const BASE = 'http://127.0.0.1:5001/jf-propiedad-raiz/us-central1';
const KEY = 'test-key-with-at-least-32-chars!!!';
const PROPERTY = { slug: 'casa-en-el-retiro-JF-0010', status: 'ACTIVE' };

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function load() {
  vi.resetModules();
  return import('./property-detail');
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

describe('fetchPropertyDetailServer', () => {
  it('llama al backend directo con la clave interna y devuelve el inmueble', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: PROPERTY }));
    const { fetchPropertyDetailServer } = await load();

    const result = await fetchPropertyDetailServer('casa-en-el-retiro-JF-0010');

    expect(result).toEqual(PROPERTY);
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe(`${BASE}/api/api/v1/properties/casa-en-el-retiro-JF-0010`);
    expect(new Headers(call?.[1]?.headers).get('X-Internal-Key')).toBe(KEY);
  });

  it('devuelve null cuando el backend responde 404', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false }, 404));
    const { fetchPropertyDetailServer } = await load();

    expect(await fetchPropertyDetailServer('no-existe-JF-9999')).toBeNull();
  });

  it('devuelve null cuando la respuesta 200 no trae datos', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false }));
    const { fetchPropertyDetailServer } = await load();

    expect(await fetchPropertyDetailServer('x-JF-0001')).toBeNull();
  });

  it('lanza error ante un fallo real del backend (5xx), sin disfrazarlo de 404', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: false }, 500));
    const { fetchPropertyDetailServer } = await load();

    await expect(fetchPropertyDetailServer('x-JF-0001')).rejects.toThrow('500');
  });

  it('codifica el slug en la URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, data: PROPERTY }));
    const { fetchPropertyDetailServer } = await load();

    await fetchPropertyDetailServer('a/b');

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE}/api/api/v1/properties/a%2Fb`);
  });
});
