/**
 * Tests de sitemap.xml de propiedad (AC2.7.3, AC0.4.5) - API real.
 * Valida: solo ACTIVE, omite EN sin traducción completa, priority/alternates correctos.
 * Mocking fetch global (patrón consistente con sitemap.ts principal).
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mocks de módulos server-only ANTES de importar Sitemap
vi.mock('@/server/backend-url', () => ({
  backendUrl: vi.fn(
    (path: string) => `http://127.0.0.1:5001/jf-propiedad-raiz/us-central1/api${path}`,
  ),
}));

vi.mock('@/server/config/server-config', () => ({
  env: {
    BFF_INTERNAL_KEY: 'test-internal-key-32-chars-minimum',
  },
}));

vi.mock('@/i18n/routes', () => ({
  getRoute: vi.fn((key: string, locale: string, params?: Record<string, string>) => {
    const routes: Record<string, Record<string, string>> = {
      property: { es: '/es/propiedad/[slug]', en: '/en/property/[slug]' },
    };
    let path = routes[key]?.[locale] || `/${locale}`;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        path = path.replace(`[${k}]`, v);
      });
    }
    return path;
  }),
}));

// Mock de fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

const BASE = 'https://example.test';

function setupEnv() {
  process.env.NEXT_PUBLIC_SITE_URL = BASE;
}

import Sitemap from './sitemap';

function mockPropertiesResponse(properties: any[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ success: true, data: { items: properties } }),
  });
}

function makeProperty(overrides: any = {}) {
  return {
    id: 'prop-1',
    codigo: 'JF-0001',
    slug: 'casa-test',
    status: 'ACTIVE',
    operacion: 'VENTA',
    tipo: 'CASA',
    titulo: { es: 'Casa Test', en: 'Test House' },
    descripcion: { es: 'Desc ES', en: 'Desc EN' },
    precio: 500000000,
    departamento: 'Antioquia',
    municipio: 'Medellín',
    estrato: 5,
    dormitorios: 3,
    banos: 2,
    areaConstruida: 120,
    destacada: false,
    createdAt: '2024-12-01T10:00:00Z',
    updatedAt: '2024-12-01T10:00:00Z',
    ...overrides,
  };
}

describe('sitemap.xml de propiedad (AC2.7.3 / AC0.4.5) - API real', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupEnv();
  });

  it('incluye solo propiedades ACTIVE', async () => {
    mockPropertiesResponse([
      makeProperty({ slug: 'activa-1', status: 'ACTIVE' }),
      makeProperty({ slug: 'oculta-1', status: 'HIDDEN' }),
      makeProperty({ slug: 'borrada-1', status: 'DELETED' }),
    ]);

    const urls = await Sitemap();

    const activa = urls.find((u) => u.url.includes('activa-1'));
    const oculta = urls.find((u) => u.url.includes('oculta-1'));
    const borrada = urls.find((u) => u.url.includes('borrada-1'));
    expect(activa).toBeDefined();
    expect(oculta).toBeUndefined();
    expect(borrada).toBeUndefined();
  });

  it('omite EN sin traducción completa (AC0.4.5)', async () => {
    mockPropertiesResponse([
      makeProperty({
        slug: 'completa-1',
        titulo: { es: 'C', en: 'C' },
        descripcion: { es: 'd', en: 'd' },
      }),
      makeProperty({
        slug: 'solo-es-1',
        titulo: { es: 'C', en: '' },
        descripcion: { es: 'd', en: '' },
      }),
      makeProperty({
        slug: 'sin-desc-en-1',
        titulo: { es: 'C', en: 'C' },
        descripcion: { es: 'd', en: '' },
      }),
    ]);

    const urls = await Sitemap();

    const completaEn = urls.find((u) => u.url === `${BASE}/en/property/completa-1`);
    const soloEsEn = urls.find((u) => u.url === `${BASE}/en/property/solo-es-1`);
    const sinDescEnEn = urls.find((u) => u.url === `${BASE}/en/property/sin-desc-en-1`);

    expect(completaEn).toBeDefined();
    expect(soloEsEn).toBeUndefined();
    expect(sinDescEnEn).toBeUndefined();

    // En español SÍ deben estar
    const soloEsEs = urls.find((u) => u.url === `${BASE}/es/propiedad/solo-es-1`);
    expect(soloEsEs).toBeDefined();
  });

  it('priority 0.9 para destacadas, 0.7 para normales', async () => {
    mockPropertiesResponse([
      makeProperty({ slug: 'destacada-1', destacada: true }),
      makeProperty({ slug: 'normal-1', destacada: false }),
    ]);

    const urls = await Sitemap();

    const dest = urls.find((u) => u.url.includes('destacada-1'));
    const norm = urls.find((u) => u.url.includes('normal-1'));
    expect(dest?.priority).toBe(0.9);
    expect(norm?.priority).toBe(0.7);
  });

  it('changeFrequency weekly y alternates correctos', async () => {
    mockPropertiesResponse([makeProperty({ slug: 'prop-1' })]);

    const urls = await Sitemap();
    const prop = urls.find((u) => u.url.includes('prop-1'));

    expect(prop?.changeFrequency).toBe('weekly');
    expect(prop?.alternates?.languages?.['es-CO']).toBe(`${BASE}/es/propiedad/prop-1`);
    expect(prop?.alternates?.languages?.en).toBe(`${BASE}/en/property/prop-1`);
    expect(prop?.alternates?.languages?.['x-default']).toBe(`${BASE}/es/propiedad/prop-1`);
  });

  it('lastModified usa updatedAt/createdAt', async () => {
    mockPropertiesResponse([
      makeProperty({
        slug: 'con-fecha',
        updatedAt: '2024-12-15T10:00:00Z',
        createdAt: '2024-12-01T10:00:00Z',
      }),
    ]);

    const urls = await Sitemap();
    const prop = urls.find((u) => u.url.includes('con-fecha'));

    // lastModified debe ser new Date('2024-12-15T10:00:00Z')
    expect(prop?.lastModified).toBeInstanceOf(Date);
    expect(prop?.lastModified?.toISOString()).toBe('2024-12-15T10:00:00.000Z');
  });

  it('devuelve array vacío si fetch falla', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const urls = await Sitemap();
    expect(urls).toEqual([]);
  });
});
