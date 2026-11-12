/**
 * Tests de sitemap.xml de propiedad (AC2.7.3, AC0.4.5).
 * Valida: solo ACTIVE, omite EN sin traducción completa, priority/alternates correctos.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock del módulo de mocks ANTES de importar
vi.mock('@/mocks/property-mock', () => ({
  getPropertiesByOperacion: vi.fn(),
  getPropertyBySlug: vi.fn(),
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

const BASE = 'https://example.test';

function setupEnv() {
  process.env.NEXT_PUBLIC_SITE_URL = BASE;
}

import { getPropertiesByOperacion, getPropertyBySlug } from '@/mocks/property-mock';
import Sitemap from './sitemap';

const mockGetPropertiesByOperacion = vi.mocked(getPropertiesByOperacion);
const mockGetPropertyBySlug = vi.mocked(getPropertyBySlug);

function makeCard(overrides: any = {}) {
  return {
    id: 'prop-1',
    codigo: 'JF-0001',
    slug: 'casa-test',
    operacion: 'VENTA',
    tipo: 'CASA',
    titulo: { es: 'Casa Test', en: 'Test House' },
    precio: 500000000,
    departamento: 'Antioquia',
    municipio: 'Medellín',
    estrato: 5,
    dormitorios: 3,
    banos: 2,
    areaConstruida: 120,
    destacada: false,
    portada: { derivados: [] },
    ...overrides,
  };
}

function makeDetail(overrides: any = {}) {
  return {
    ...makeCard(),
    status: 'ACTIVE',
    updatedAt: '2024-12-01T10:00:00Z',
    descripcion: { es: 'Desc ES', en: 'Desc EN' },
    predial: '2.500.000',
    administracion: '450.000',
    acabados: { es: '', en: '' },
    antiguedad: '5',
    areaLote: 1000,
    parqueaderos: 2,
    deposito: 1,
    amenidades: [],
    puntosInteres: [],
    fotos: [],
    videos: [],
    panoramas: [],
    fechaPublicacion: '2024-12-01',
    ...overrides,
  };
}

// Helper para mock que retorna según slug
function setupPropertyMocks(properties: Array<{ slug: string; card?: any; detail?: any }>) {
  mockGetPropertiesByOperacion.mockReturnValue(
    properties.map((p) => makeCard({ slug: p.slug, ...p.card })),
  );
  mockGetPropertyBySlug.mockImplementation((slug: string) => {
    const found = properties.find((p) => p.slug === slug);
    return found ? makeDetail({ slug, ...found.detail }) : undefined;
  });
}

describe('sitemap.xml de propiedad (AC2.7.3 / AC0.4.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupEnv();
  });

  it('incluye solo propiedades ACTIVE', async () => {
    setupPropertyMocks([
      { slug: 'activa-1', detail: { status: 'ACTIVE' } },
      { slug: 'oculta-1', detail: { status: 'HIDDEN' } },
    ]);

    const urls = await Sitemap();

    const activa = urls.find((u) => u.url.includes('activa-1'));
    const oculta = urls.find((u) => u.url.includes('oculta-1'));
    expect(activa).toBeDefined();
    expect(oculta).toBeUndefined();
  });

  it('omite EN sin traducción completa (AC0.4.5)', async () => {
    setupPropertyMocks([
      {
        slug: 'completa-1',
        detail: { titulo: { es: 'C', en: 'C' }, descripcion: { es: 'd', en: 'd' } },
      },
      {
        slug: 'solo-es-1',
        detail: { titulo: { es: 'C', en: '' }, descripcion: { es: 'd', en: '' } },
      },
      {
        slug: 'sin-desc-en-1',
        detail: { titulo: { es: 'C', en: 'C' }, descripcion: { es: 'd', en: '' } },
      },
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
    setupPropertyMocks([
      { slug: 'destacada-1', card: { destacada: true }, detail: { destacada: true } },
      { slug: 'normal-1', card: { destacada: false }, detail: { destacada: false } },
    ]);

    const urls = await Sitemap();

    const dest = urls.find((u) => u.url.includes('destacada-1'));
    const norm = urls.find((u) => u.url.includes('normal-1'));
    expect(dest?.priority).toBe(0.9);
    expect(norm?.priority).toBe(0.7);
  });

  it('changeFrequency weekly y alternates correctos', async () => {
    setupPropertyMocks([{ slug: 'prop-1', detail: {} }]);

    const urls = await Sitemap();
    const prop = urls.find((u) => u.url.includes('prop-1'));

    expect(prop?.changeFrequency).toBe('weekly');
    expect(prop?.alternates?.languages?.['es-CO']).toBe(`${BASE}/es/propiedad/prop-1`);
    expect(prop?.alternates?.languages?.en).toBe(`${BASE}/en/property/prop-1`);
    expect(prop?.alternates?.languages?.['x-default']).toBe(`${BASE}/es/propiedad/prop-1`);
  });
});
