import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/server/backend-url', () => ({
  backendUrl: (p: string) => `http://backend.test${p}`,
}));
vi.mock('@/server/config/server-config', () => ({ env: { BFF_INTERNAL_KEY: 'key-test' } }));

import { fetchAboutExtractServer } from './about-extract';

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

const ok = (extracto: unknown) =>
  reply(200, { success: true, data: { titulo: { es: 'T' }, extracto } });

describe('fetchAboutExtractServer', () => {
  it('devuelve el extracto del idioma pedido y llama con la llave interna', async () => {
    fetchMock.mockResolvedValue(ok({ es: 'Hola', en: 'Hello' }));

    expect(await fetchAboutExtractServer('en')).toBe('Hello');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://backend.test/api/v1/about');
    expect((init.headers as Record<string, string>)['X-Internal-Key']).toBe('key-test');
    expect(init.cache).toBe('no-store');
  });

  it('usa el español si falta el idioma pedido', async () => {
    fetchMock.mockResolvedValue(ok({ es: 'Hola' }));
    expect(await fetchAboutExtractServer('en')).toBe('Hola');
  });

  it('usa el español si el idioma pedido viene vacío', async () => {
    fetchMock.mockResolvedValue(ok({ es: 'Hola', en: '   ' }));
    expect(await fetchAboutExtractServer('en')).toBe('Hola');
  });

  it('recorta los espacios del texto', async () => {
    fetchMock.mockResolvedValue(ok({ es: '  Hola  ' }));
    expect(await fetchAboutExtractServer('es')).toBe('Hola');
  });

  it('devuelve null si no hay extracto en ningún idioma', async () => {
    fetchMock.mockResolvedValueOnce(ok(undefined));
    expect(await fetchAboutExtractServer('es')).toBeNull();

    fetchMock.mockResolvedValueOnce(ok({ es: '  ', en: '' }));
    expect(await fetchAboutExtractServer('en')).toBeNull();
  });

  it('lanza si el backend responde con error', async () => {
    fetchMock.mockResolvedValue(reply(500, { success: false }));
    await expect(fetchAboutExtractServer('es')).rejects.toThrow(/500/);
  });

  it('lanza si la respuesta no tiene la forma esperada', async () => {
    fetchMock.mockResolvedValueOnce(
      reply(200, { success: false, data: { extracto: { es: 'x' } } }),
    );
    await expect(fetchAboutExtractServer('es')).rejects.toThrow(/inesperada/);

    fetchMock.mockResolvedValueOnce(reply(200, { success: true, data: null }));
    await expect(fetchAboutExtractServer('es')).rejects.toThrow(/inesperada/);

    fetchMock.mockResolvedValueOnce(reply(200, { success: true, data: 'texto' }));
    await expect(fetchAboutExtractServer('es')).rejects.toThrow(/inesperada/);
  });
});
