import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/server/backend-url', () => ({
  backendUrl: (p: string) => `http://backend.test${p}`,
}));
vi.mock('@/server/config/server-config', () => ({ env: { BFF_INTERNAL_KEY: 'key-test' } }));

import { fetchActiveServicesServer, fetchServiceBySlugServer } from './services';

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
const ok = (items: unknown[]) => reply(200, { success: true, data: { items } });
const svc = (over: Record<string, unknown> = {}) => ({
  id: 'x',
  slug: 'asesoria-legal',
  status: 'ACTIVE',
  orden: 1,
  titulo: { es: 'Asesoría Legal', en: 'Legal Advisory' },
  resumen: { es: 'Resumen', en: 'Summary' },
  cuerpo: { es: 'Cuerpo es', en: 'Body en' },
  ...over,
});

describe('fetchServiceBySlugServer', () => {
  it('devuelve el servicio con su cuerpo y llama al listado con la llave interna', async () => {
    fetchMock.mockResolvedValue(ok([svc()]));

    const result = await fetchServiceBySlugServer('asesoria-legal');

    expect(result?.cuerpo).toEqual({ es: 'Cuerpo es', en: 'Body en' });
    expect(result?.titulo.en).toBe('Legal Advisory');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://backend.test/api/v1/services');
    expect((init.headers as Record<string, string>)['X-Internal-Key']).toBe('key-test');
    expect(init.cache).toBe('no-store');
  });

  it('devuelve null si el slug no está en el listado', async () => {
    fetchMock.mockResolvedValue(ok([svc()]));
    expect(await fetchServiceBySlugServer('no-existe-xyz')).toBeNull();
  });

  it('el slug se compara exacto, no por prefijo', async () => {
    fetchMock.mockResolvedValue(ok([svc()]));
    expect(await fetchServiceBySlugServer('asesoria')).toBeNull();
  });

  it('devuelve null para un servicio que no está ACTIVE aunque venga en el listado', async () => {
    fetchMock.mockResolvedValue(ok([svc({ slug: 'oculto', status: 'HIDDEN' })]));
    expect(await fetchServiceBySlugServer('oculto')).toBeNull();
  });

  it('lanza (no devuelve null) si el backend falla', async () => {
    fetchMock.mockResolvedValue(reply(500, { success: false }));
    await expect(fetchServiceBySlugServer('asesoria-legal')).rejects.toThrow('500');
  });
});

describe('fetchActiveServicesServer', () => {
  it('ordena por orden y descarta los que no se pueden mostrar', async () => {
    fetchMock.mockResolvedValue(
      ok([
        svc({ slug: 'b', orden: 2 }),
        svc({ slug: 'a', orden: 1 }),
        svc({ slug: '', orden: 3 }),
        svc({ slug: 'sin-titulo', titulo: undefined }),
        svc({ slug: 'sin-orden', orden: undefined }),
      ]),
    );
    const result = await fetchActiveServicesServer();
    expect(result.map((s) => s.slug)).toEqual(['a', 'b']);
  });

  it('lanza si data.items no es un arreglo', async () => {
    fetchMock.mockResolvedValue(reply(200, { success: true, data: {} }));
    await expect(fetchActiveServicesServer()).rejects.toThrow('inesperada');
  });

  it('lanza si success es false', async () => {
    fetchMock.mockResolvedValue(reply(200, { success: false, data: { items: [] } }));
    await expect(fetchActiveServicesServer()).rejects.toThrow('inesperada');
  });
});
