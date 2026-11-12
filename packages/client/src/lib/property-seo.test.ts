/**
 * Tests del SEO de la ficha (AC2.7.1, 2.7.2, 2.7.3, 2.7.6).
 */

import { describe, expect, it } from 'vitest';
import type { PropertyDetail } from '@jf/shared-types';
import { getRoute } from '@/i18n/routes';
import { buildPropertyJsonLd, buildPropertyMetadata, serializeJsonLd } from './property-seo';

const BASE = 'https://example.test';
const SLUG = 'casa-en-el-retiro-JF-0010';

function makeProperty(overrides: Record<string, unknown> = {}): PropertyDetail {
  return {
    slug: SLUG,
    status: 'ACTIVE',
    titulo: { es: 'Casa en El Retiro', en: 'House in El Retiro' },
    descripcion: { es: 'Descripción en español', en: 'Description in English' },
    precio: 450000000,
    municipio: 'El Retiro',
    departamento: 'Antioquia',
    areaConstruida: 120,
    dormitorios: 3,
    banos: 2,
    fotos: [
      {
        derivados: [{ clave: 'f/320.webp' }, { clave: 'f/640.webp' }, { clave: 'f/1280.webp' }],
      },
    ],
    ...overrides,
  } as unknown as PropertyDetail;
}

const input = (locale: 'es' | 'en', property = makeProperty()) => ({
  property,
  locale,
  slug: SLUG,
  baseUrl: BASE,
});

describe('buildPropertyMetadata (AC2.7.1 / 2.7.2)', () => {
  it('arma el título con el nombre del inmueble en cada idioma', () => {
    expect(buildPropertyMetadata(input('es')).title).toBe('Casa en El Retiro | JF Propiedad Raíz');
    expect(buildPropertyMetadata(input('en')).title).toBe('House in El Retiro | JF Propiedad Raíz');
  });

  it('recorta la descripción a 160 caracteres', () => {
    const largo = makeProperty({ descripcion: { es: 'x'.repeat(300), en: 'y'.repeat(300) } });
    expect(buildPropertyMetadata(input('es', largo)).description).toHaveLength(160);
  });

  it('el canonical apunta a la ruta del idioma actual', () => {
    const es = buildPropertyMetadata(input('es')).alternates?.canonical;
    const en = buildPropertyMetadata(input('en')).alternates?.canonical;
    expect(es).toBe(`${BASE}${getRoute('property', 'es', { slug: SLUG })}`);
    expect(en).toBe(`${BASE}${getRoute('property', 'en', { slug: SLUG })}`);
    expect(es).not.toBe(en);
  });

  it('declara hreflang es-CO, en y x-default (apunta al español)', () => {
    const languages = buildPropertyMetadata(input('en')).alternates?.languages as Record<
      string,
      string
    >;
    expect(Object.keys(languages).sort()).toEqual(['en', 'es-CO', 'x-default']);
    expect(languages['x-default']).toBe(languages['es-CO']);
    expect(languages.en).not.toBe(languages['es-CO']);
  });

  it('usa la derivada más grande como og:image y og-default.jpg si no hay fotos', () => {
    const conFoto = buildPropertyMetadata(input('es')).openGraph?.images as { url: string }[];
    expect(conFoto[0]?.url).toBe(`${BASE}/f/1280.webp`);
    const sinFoto = buildPropertyMetadata(input('es', makeProperty({ fotos: [] }))).openGraph
      ?.images as { url: string }[];
    expect(sinFoto[0]?.url).toBe(`${BASE}/og-default.jpg`);
  });

  it('indexa en español aunque falte la traducción al inglés', () => {
    const sinEn = makeProperty({ titulo: { es: 'Casa', en: '' } });
    expect(buildPropertyMetadata(input('es', sinEn)).robots).toMatchObject({ index: true });
  });

  it('no indexa en inglés si falta la traducción completa', () => {
    const sinEn = makeProperty({ titulo: { es: 'Casa', en: '' } });
    expect(buildPropertyMetadata(input('en', sinEn)).robots).toMatchObject({ index: false });
  });
});

describe('buildPropertyJsonLd / serializeJsonLd (AC2.7.6)', () => {
  it('no contiene undefined y se puede parsear', () => {
    const sinArea = makeProperty({ areaConstruida: undefined, dormitorios: undefined });
    const texto = serializeJsonLd(buildPropertyJsonLd(input('es', sinArea)));
    expect(texto).not.toContain('undefined');
    expect(() => JSON.parse(texto)).not.toThrow();
    expect(JSON.parse(texto)).not.toHaveProperty('floorSize');
  });

  it('incluye inLanguage según el idioma y addressCountry "CO"', () => {
    const es = buildPropertyJsonLd(input('es'));
    const en = buildPropertyJsonLd(input('en'));
    expect(es.inLanguage).toBe('es-CO');
    expect(en.inLanguage).toBe('en');
    expect((es.address as { addressCountry: string }).addressCountry).toBe('CO');
  });

  it('escapa "<" para que una descripción no cierre el script', () => {
    const peligrosa = makeProperty({
      descripcion: { es: '</script><b>hola</b>', en: 'x' },
    });
    const texto = serializeJsonLd(buildPropertyJsonLd(input('es', peligrosa)));
    expect(texto).not.toContain('</script>');
    expect(JSON.parse(texto).description).toBe('</script><b>hola</b>');
  });
});
