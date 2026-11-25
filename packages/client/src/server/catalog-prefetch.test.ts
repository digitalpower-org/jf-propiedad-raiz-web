/**
 * Tests del prefetch del catálogo en el servidor (AC2.2.12): pide al backend lo mismo que pediría
 * el cliente, lo guarda con la misma clave y, si algo falla, no rompe la página.
 */

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { PAGE_SIZE, propertiesQueryKey } from '@/lib/properties-query';

vi.mock('server-only', () => ({ default: undefined }));

const BASE = 'http://127.0.0.1:5001/jf-propiedad-raiz/us-central1';
const KEY = 'test-key-with-at-least-32-chars!!!';
const IP = '203.0.113.7';
const fetchMock = vi.fn<typeof fetch>();
let consola: MockInstance<typeof console.error>;

const card = (slug: string) => ({ id: slug, slug, titulo: { es: slug, en: slug } });

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const pagina = (items: unknown[], nextCursor: string | null) =>
  json({ success: true, data: { items, nextCursor } });

async function cargar() {
  vi.resetModules();
  return import('./catalog-prefetch');
}

const urls = () => fetchMock.mock.calls.map(([entrada]) => new URL(String(entrada)));

beforeAll(() => {
  process.env.BFF_INTERNAL_KEY = KEY;
  process.env.SESSION_JWT_SECRET = 'test-secret-with-at-least-32-chars!!!';
  process.env.SESSION_JWT_SECRET_PREVIOUS = '';
  process.env.FUNCTIONS_BASE_URL = BASE;
});

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  consola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  consola.mockRestore();
});

describe('clientIpFromHeaders', () => {
  it('toma el primer valor de x-forwarded-for', async () => {
    const { clientIpFromHeaders } = await cargar();
    const cabeceras = new Headers({ 'x-forwarded-for': ` ${IP} , 10.0.0.1` });
    expect(clientIpFromHeaders(cabeceras)).toBe(IP);
  });

  it('sin x-forwarded-for usa x-real-ip', async () => {
    const { clientIpFromHeaders } = await cargar();
    expect(clientIpFromHeaders(new Headers({ 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4');
  });

  it('sin cabeceras de proxy devuelve undefined', async () => {
    const { clientIpFromHeaders } = await cargar();
    expect(clientIpFromHeaders(new Headers())).toBeUndefined();
  });

  it('nunca se fía de un x-client-ip enviado por el cliente', async () => {
    const { clientIpFromHeaders } = await cargar();
    expect(clientIpFromHeaders(new Headers({ 'x-client-ip': '1.2.3.4' }))).toBeUndefined();
  });
});

describe('prefetchCatalogo | qué pide', () => {
  it('pide la primera página de destacadas con el tamaño de página del cliente', async () => {
    fetchMock.mockResolvedValue(pagina([card('a')], 'c1'));
    const { prefetchCatalogo } = await cargar();
    await prefetchCatalogo({ operacion: 'VENTA', filtros: {}, clientIp: IP });

    expect(urls()).toHaveLength(1);
    const [url] = urls();
    expect(url?.pathname).toMatch(/\/api\/v1\/properties$/);
    expect(Object.fromEntries(url?.searchParams ?? [])).toEqual({
      operacion: 'VENTA',
      destacada: 'true',
      limit: String(PAGE_SIZE),
    });
  });

  it('envía la clave interna y la IP del visitante', async () => {
    fetchMock.mockResolvedValue(pagina([card('a')], 'c1'));
    const { prefetchCatalogo } = await cargar();
    await prefetchCatalogo({ operacion: 'VENTA', filtros: {}, clientIp: IP });

    const cabeceras = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(cabeceras.get('X-Internal-Key')).toBe(KEY);
    expect(cabeceras.get('X-Client-IP')).toBe(IP);
  });

  it('sin IP del visitante no manda X-Client-IP', async () => {
    fetchMock.mockResolvedValue(pagina([card('a')], 'c1'));
    const { prefetchCatalogo } = await cargar();
    await prefetchCatalogo({ operacion: 'VENTA', filtros: {} });

    const cabeceras = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(cabeceras.has('X-Client-IP')).toBe(false);
  });

  it('reenvía los filtros de base de datos', async () => {
    fetchMock.mockResolvedValue(pagina([card('a')], 'c1'));
    const { prefetchCatalogo } = await cargar();
    await prefetchCatalogo({
      operacion: 'ALQUILER',
      filtros: {
        tipo: 'CASA',
        departamento: 'Antioquia',
        municipio: 'Medellín',
        precioMin: 100,
        precioMax: 900,
      },
    });

    expect(Object.fromEntries(urls()[0]?.searchParams ?? [])).toEqual({
      operacion: 'ALQUILER',
      destacada: 'true',
      limit: String(PAGE_SIZE),
      tipo: 'CASA',
      departamento: 'Antioquia',
      municipio: 'Medellín',
      precioMin: '100',
      precioMax: '900',
    });
  });

  it('pasa una señal para poder cortar una espera larga', async () => {
    fetchMock.mockResolvedValue(pagina([card('a')], 'c1'));
    const { prefetchCatalogo } = await cargar();
    await prefetchCatalogo({ operacion: 'VENTA', filtros: {} });

    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('prefetchCatalogo | qué guarda', () => {
  it('con más páginas de destacadas guarda solo la primera, con la misma forma y clave del cliente', async () => {
    fetchMock.mockResolvedValue(pagina([card('a')], 'c1'));
    const { prefetchCatalogo } = await cargar();
    const estado = await prefetchCatalogo({ operacion: 'VENTA', filtros: { tipo: 'CASA' } });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(estado.queries).toHaveLength(1);
    expect(estado.queries[0]?.queryKey).toEqual(
      propertiesQueryKey({ operacion: 'VENTA', destacada: true, tipo: 'CASA' }),
    );
    expect(estado.queries[0]?.state.data).toEqual({
      pages: [{ success: true, data: { items: [card('a')], nextCursor: 'c1' } }],
      pageParams: [undefined],
    });
  });

  it('si las destacadas se agotan en la primera página, guarda también las no destacadas', async () => {
    fetchMock
      .mockResolvedValueOnce(pagina([card('a')], null))
      .mockResolvedValueOnce(pagina([card('b')], null));
    const { prefetchCatalogo } = await cargar();
    const estado = await prefetchCatalogo({ operacion: 'VENTA', filtros: {} });

    expect(urls().map((u) => u.searchParams.get('destacada'))).toEqual(['true', 'false']);
    expect(estado.queries.map((q) => q.queryKey)).toEqual([
      propertiesQueryKey({ operacion: 'VENTA', destacada: true }),
      propertiesQueryKey({ operacion: 'VENTA', destacada: false }),
    ]);
  });
});

describe('prefetchCatalogo | si algo falla no rompe la página', () => {
  it('un error del backend deja el estado vacío y no pide las no destacadas', async () => {
    fetchMock.mockResolvedValue(json({ success: false, data: { code: 'RATE_LIMITED' } }, 429));
    const { prefetchCatalogo } = await cargar();
    const estado = await prefetchCatalogo({ operacion: 'VENTA', filtros: {} });

    expect(estado.queries).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(consola).toHaveBeenCalled(); // queda registrado: un 429 no puede pasar en silencio
  });

  it('un fallo de red deja el estado vacío y no lanza', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const { prefetchCatalogo } = await cargar();

    await expect(prefetchCatalogo({ operacion: 'VENTA', filtros: {} })).resolves.toEqual(
      expect.objectContaining({ queries: [] }),
    );
    expect(consola).toHaveBeenCalled();
  });

  it('una respuesta con otra forma no se guarda', async () => {
    fetchMock.mockResolvedValue(json({ success: true, data: { items: 'no es un arreglo' } }));
    const { prefetchCatalogo } = await cargar();
    const estado = await prefetchCatalogo({ operacion: 'VENTA', filtros: {} });

    expect(estado.queries).toEqual([]);
  });

  it('si fallan las no destacadas conserva las destacadas', async () => {
    fetchMock
      .mockResolvedValueOnce(pagina([card('a')], null))
      .mockResolvedValueOnce(json({ success: false, data: { code: 'INTERNAL' } }, 500));
    const { prefetchCatalogo } = await cargar();
    const estado = await prefetchCatalogo({ operacion: 'VENTA', filtros: {} });

    expect(estado.queries.map((q) => q.queryKey)).toEqual([
      propertiesQueryKey({ operacion: 'VENTA', destacada: true }),
    ]);
  });
});

describe('prefetchCatalogo | huecos de mutación (AC2.2.12)', () => {
  it('pide siempre sin caché de fetch (no-store): cada visitante ve datos frescos', async () => {
    fetchMock.mockResolvedValue(pagina([card('a')], 'c1'));
    const { prefetchCatalogo } = await cargar();
    await prefetchCatalogo({ operacion: 'VENTA', filtros: {} });

    expect(fetchMock.mock.calls[0]?.[1]?.cache).toBe('no-store');
  });

  it('un HTTP de error no se guarda aunque el cuerpo parezca válido', async () => {
    fetchMock.mockResolvedValue(
      json({ success: true, data: { items: [card('a')], nextCursor: null } }, 503),
    );
    const { prefetchCatalogo } = await cargar();
    const estado = await prefetchCatalogo({ operacion: 'VENTA', filtros: {} });

    expect(estado.queries).toEqual([]);
    expect(consola).toHaveBeenCalled();
  });

  it('una respuesta 200 sin success no se guarda', async () => {
    fetchMock.mockResolvedValue(json({ data: { items: [card('a')], nextCursor: null } }));
    const { prefetchCatalogo } = await cargar();
    const estado = await prefetchCatalogo({ operacion: 'VENTA', filtros: {} });

    expect(estado.queries).toEqual([]);
  });

  it('un nextCursor que no es texto se guarda como null', async () => {
    fetchMock.mockResolvedValue(
      json({ success: true, data: { items: [card('a')], nextCursor: 42 } }),
    );
    const { prefetchCatalogo } = await cargar();
    const estado = await prefetchCatalogo({ operacion: 'VENTA', filtros: {} });

    expect(estado.queries[0]?.state.data).toEqual({
      pages: [{ success: true, data: { items: [card('a')], nextCursor: null } }],
      pageParams: [undefined],
    });
  });
});
