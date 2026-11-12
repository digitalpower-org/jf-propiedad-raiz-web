/**
 * Tests de sitemap.xml principal (AC2.7.3, AC0.4.5).
 * Mockea solo el acceso al backend; usa el getRoute real.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRoute } from '@/i18n/routes';

vi.mock('server-only', () => ({ default: undefined }));

const fetchAllMock = vi.hoisted(() => vi.fn());
vi.mock('@/server/public-properties', () => ({
  fetchAllPublicProperties: () => fetchAllMock(),
}));
vi.mock('@/server/backend-url', () => ({
  backendUrl: (path: string) => `http://backend.test${path}`,
}));
vi.mock('@/server/config/server-config', () => ({
  env: { BFF_INTERNAL_KEY: 'test-internal-key-32-chars-minimum' },
}));

import Sitemap from './sitemap';

const BASE = 'https://example.test';
const CREATED = '2026-11-01T10:00:00.000Z';

const card = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  slug: 'casa-JF-0001',
  destacada: false,
  createdAt: CREATED,
  titulo: { es: 'Casa', en: 'House' },
  ...over,
});

beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = BASE;
});

beforeEach(() => {
  fetchAllMock.mockReset();
  fetchAllMock.mockResolvedValue([]);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ success: true, data: { items: [] } }))),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const urlsOf = (result: { url: string }[], slug: string) =>
  result.filter((u) => u.url.includes(slug));

describe('sitemap principal', () => {
  it('incluye las rutas estáticas en ambos idiomas con hreflang', async () => {
    const result = await Sitemap();
    const home = result.find((u) => u.url === `${BASE}${getRoute('home', 'es')}`);

    expect(home).toBeDefined();
    expect(home?.alternates?.languages).toEqual({
      'es-CO': `${BASE}${getRoute('home', 'es')}`,
      en: `${BASE}${getRoute('home', 'en')}`,
      'x-default': `${BASE}${getRoute('home', 'es')}`,
    });
    expect(result.some((u) => u.url === `${BASE}${getRoute('home', 'en')}`)).toBe(true);
  });

  it('una propiedad con título en inglés genera entradas es y en', async () => {
    fetchAllMock.mockResolvedValue([card()]);
    const result = await Sitemap();
    const entradas = urlsOf(result, 'casa-JF-0001').map((u) => u.url);

    expect(entradas).toEqual([
      `${BASE}${getRoute('property', 'es', { slug: 'casa-JF-0001' })}`,
      `${BASE}${getRoute('property', 'en', { slug: 'casa-JF-0001' })}`,
    ]);
  });

  it('omite la entrada en inglés si falta titulo.en (AC0.4.5)', async () => {
    fetchAllMock.mockResolvedValue([
      card({ slug: 'sin-en-JF-0002', titulo: { es: 'Casa', en: '' } }),
      card({ slug: 'espacios-JF-0003', titulo: { es: 'Casa', en: '   ' } }),
    ]);
    const result = await Sitemap();

    expect(urlsOf(result, 'sin-en-JF-0002')).toHaveLength(1);
    expect(urlsOf(result, 'espacios-JF-0003')).toHaveLength(1);
    expect(urlsOf(result, 'sin-en-JF-0002')[0]?.url).toContain('/es/');
  });

  it('prioriza 0.9 las destacadas y 0.7 el resto', async () => {
    fetchAllMock.mockResolvedValue([
      card({ slug: 'dest-JF-0004', destacada: true }),
      card({ slug: 'norm-JF-0005', destacada: false }),
    ]);
    const result = await Sitemap();

    expect(urlsOf(result, 'dest-JF-0004')[0]?.priority).toBe(0.9);
    expect(urlsOf(result, 'norm-JF-0005')[0]?.priority).toBe(0.7);
  });

  it('usa createdAt como lastModified (la tarjeta no trae updatedAt)', async () => {
    fetchAllMock.mockResolvedValue([card()]);
    const result = await Sitemap();

    expect(urlsOf(result, 'casa-JF-0001')[0]?.lastModified).toEqual(new Date(CREATED));
  });

  it('si falla la lectura de propiedades sigue sirviendo lo demás y lo registra', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchAllMock.mockRejectedValue(new Error('backend caído'));
    const result = await Sitemap();

    expect(result.length).toBeGreaterThan(0);
    expect(result.some((u) => u.url.includes('JF-'))).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe('sitemap principal: hreflang de propiedades y servicios', () => {
  it('las propiedades declaran es-CO, en y x-default (apunta al español)', async () => {
    fetchAllMock.mockResolvedValue([card()]);
    const [es] = urlsOf(await Sitemap(), 'casa-JF-0001');
    const urlEs = `${BASE}${getRoute('property', 'es', { slug: 'casa-JF-0001' })}`;
    const urlEn = `${BASE}${getRoute('property', 'en', { slug: 'casa-JF-0001' })}`;

    expect(es?.alternates?.languages).toEqual({
      'es-CO': urlEs,
      en: urlEn,
      'x-default': urlEs,
    });
  });

  it('los servicios del backend generan entradas es y en con prioridad 0.8', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ success: true, data: { items: [{ slug: 'asesoria-legal' }] } }),
          ),
      ),
    );
    const entradas = urlsOf(await Sitemap(), 'asesoria-legal');

    expect(entradas.map((u) => u.url)).toEqual([
      `${BASE}${getRoute('serviceDetail', 'es', { slug: 'asesoria-legal' })}`,
      `${BASE}${getRoute('serviceDetail', 'en', { slug: 'asesoria-legal' })}`,
    ]);
    expect(entradas.every((u) => u.priority === 0.8)).toBe(true);
  });
});
