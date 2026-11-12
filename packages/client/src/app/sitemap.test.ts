/**
 * Tests de sitemap.xml principal (AC2.7.3).
 * Valida que incluya: rutas estáticas, servicios activos, propiedades ACTIVE,
 * y omita EN sin traducción completa (AC0.4.5).
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
      home: { es: '/es', en: '/en' },
      sale: { es: '/es/venta', en: '/en/sale' },
      rent: { es: '/es/alquiler', en: '/en/rent' },
      projects: { es: '/es/proyectos', en: '/en/projects' },
      services: { es: '/es/servicios', en: '/en/services' },
      serviceDetail: { es: '/es/servicios/[slug]', en: '/en/services/[slug]' },
      about: { es: '/es/nosotros', en: '/en/about-us' },
      property: { es: '/es/propiedad/[slug]', en: '/en/property/[slug]' },
      consign: { es: '/es/consigne-su-propiedad', en: '/en/list-your-property' },
      contact: { es: '/es/contacto', en: '/en/contact' },
      privacy: { es: '/es/aviso-de-privacidad', en: '/en/privacy-notice' },
      dataPolicy: { es: '/es/politica-de-tratamiento-de-datos', en: '/en/data-processing-policy' },
      terms: { es: '/es/terminos', en: '/en/terms' },
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

function mockServicesResponse(services: any[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ success: true, data: { items: services } }),
  });
}

function mockPropertiesResponse(properties: any[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ success: true, data: { items: properties } }),
  });
}

describe('sitemap.xml principal (AC2.7.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupEnv();
  });

  it('incluye rutas estáticas en ambos idiomas con alternates', async () => {
    mockServicesResponse([]);
    mockPropertiesResponse([]);

    const urls = await Sitemap();

    const homeEs = urls.find((u) => u.url === `${BASE}/es`);
    const homeEn = urls.find((u) => u.url === `${BASE}/en`);
    expect(homeEs).toBeDefined();
    expect(homeEn).toBeDefined();
    expect(homeEs?.alternates?.languages?.['es-CO']).toBe(`${BASE}/es`);
    expect(homeEs?.alternates?.languages?.en).toBe(`${BASE}/en`);
    expect(homeEs?.alternates?.languages?.['x-default']).toBe(`${BASE}/es`);
  });

  it('incluye servicios activos con sus alternates', async () => {
    mockServicesResponse([
      {
        id: 'svc-1',
        slug: 'avaluos',
        titulo: { es: 'Avalúos', en: 'Appraisals' },
        orden: 1,
      },
    ]);
    mockPropertiesResponse([]);

    const urls = await Sitemap();

    const svcEs = urls.find((u) => u.url === `${BASE}/es/servicios/avaluos`);
    const svcEn = urls.find((u) => u.url === `${BASE}/en/services/avaluos`);
    expect(svcEs).toBeDefined();
    expect(svcEn).toBeDefined();
    expect(svcEs?.alternates?.languages?.['es-CO']).toBe(`${BASE}/es/servicios/avaluos`);
    expect(svcEs?.alternates?.languages?.en).toBe(`${BASE}/en/services/avaluos`);
  });

  it('incluye solo propiedades ACTIVE', async () => {
    mockServicesResponse([]);
    mockPropertiesResponse([
      {
        slug: 'activa-1',
        status: 'ACTIVE',
        titulo: { es: 'Activa', en: 'Active' },
        descripcion: { es: 'd', en: 'd' },
      },
      {
        slug: 'oculta-1',
        status: 'HIDDEN',
        titulo: { es: 'Oculta', en: 'Hidden' },
        descripcion: { es: 'd', en: 'd' },
      },
      {
        slug: 'borrada-1',
        status: 'DELETED',
        titulo: { es: 'Borrada', en: 'Deleted' },
        descripcion: { es: 'd', en: 'd' },
      },
    ]);

    const urls = await Sitemap();

    const activa = urls.find((u) => u.url.includes('activa-1'));
    const oculta = urls.find((u) => u.url.includes('oculta-1'));
    const borrada = urls.find((u) => u.url.includes('borrada-1'));
    expect(activa).toBeDefined();
    expect(oculta).toBeUndefined();
    expect(borrada).toBeUndefined();
  });

  it('omite propiedades en EN sin traducción completa (AC0.4.5)', async () => {
    mockServicesResponse([]);
    mockPropertiesResponse([
      {
        slug: 'completa-1',
        status: 'ACTIVE',
        titulo: { es: 'Completa', en: 'Complete' },
        descripcion: { es: 'd', en: 'd' },
      },
      {
        slug: 'solo-es-1',
        status: 'ACTIVE',
        titulo: { es: 'Solo ES', en: '' },
        descripcion: { es: 'd', en: '' },
      },
      {
        slug: 'sin-desc-en-1',
        status: 'ACTIVE',
        titulo: { es: 'Sin Desc EN', en: 'Has Title' },
        descripcion: { es: 'd', en: '' },
      },
    ]);

    const urls = await Sitemap();

    const completaEn = urls.find((u) => u.url === `${BASE}/en/property/completa-1`);
    const soloEsEn = urls.find((u) => u.url === `${BASE}/en/property/solo-es-1`);
    const sinDescEnEn = urls.find((u) => u.url === `${BASE}/en/property/sin-desc-en-1`);

    expect(completaEn).toBeDefined();
    expect(soloEsEn).toBeUndefined();
    expect(sinDescEnEn).toBeUndefined();

    // Pero en español SÍ deben estar
    const soloEsEs = urls.find((u) => u.url === `${BASE}/es/propiedad/solo-es-1`);
    expect(soloEsEs).toBeDefined();
  });

  it('usa changeFrequency weekly y priority 0.7 para propiedades', async () => {
    mockServicesResponse([]);
    mockPropertiesResponse([
      {
        slug: 'prop-1',
        status: 'ACTIVE',
        titulo: { es: 'P', en: 'P' },
        descripcion: { es: 'd', en: 'd' },
        destacada: false,
      },
    ]);

    const urls = await Sitemap();
    const prop = urls.find((u) => u.url.includes('prop-1'));
    expect(prop?.changeFrequency).toBe('weekly');
    expect(prop?.priority).toBe(0.7);
  });

  it('priority 0.9 para propiedades destacadas', async () => {
    mockServicesResponse([]);
    mockPropertiesResponse([
      {
        slug: 'destacada-1',
        status: 'ACTIVE',
        titulo: { es: 'D', en: 'D' },
        descripcion: { es: 'd', en: 'd' },
        destacada: true,
      },
    ]);

    const urls = await Sitemap();
    const prop = urls.find((u) => u.url.includes('destacada-1'));
    expect(prop?.priority).toBe(0.9);
  });
});
