import { describe, expect, it } from 'vitest';
import type { AboutData } from '@/server/about';
import { buildAboutMetadata } from './about-seo';
import { SITE_NAME, getBaseUrl } from './property-seo';

// AC5.6.4 (con AC2.7.1, AC2.7.2 y AC0.4.5): título y descripción del idioma de la página, canonical
// y hreflang, y `noindex` para el inglés sin traducción del título o cuando no hay documento.

const documento: AboutData = {
  titulo: { es: 'Nosotros SAS', en: 'About SAS' },
  extracto: { es: 'Extracto en español', en: 'Extract in English' },
  secciones: [],
  equipo: [],
};

const robots = (m: ReturnType<typeof buildAboutMetadata>) =>
  m.robots as { index?: boolean; follow?: boolean };

const construir = (about: AboutData | null, locale: 'es' | 'en') =>
  buildAboutMetadata({ about, locale, tituloRespaldo: 'Respaldo' });

describe('buildAboutMetadata | título y descripción', () => {
  it('en español usa el título y el extracto en español', () => {
    const m = construir(documento, 'es');

    expect(m.title).toBe(`Nosotros SAS | ${SITE_NAME}`);
    expect(m.description).toBe('Extracto en español');
  });

  it('en inglés usa el título y el extracto en inglés', () => {
    const m = construir(documento, 'en');

    expect(m.title).toBe(`About SAS | ${SITE_NAME}`);
    expect(m.description).toBe('Extract in English');
  });

  it('en inglés sin extracto traducido usa el español', () => {
    const m = construir({ ...documento, extracto: { es: 'Solo español' } }, 'en');

    expect(m.description).toBe('Solo español');
  });

  it('la descripción no pasa de 160 caracteres', () => {
    const m = construir({ ...documento, extracto: { es: 'x'.repeat(200) } }, 'es');

    expect(m.description).toHaveLength(160);
  });

  it('control: sin extracto no inventa una descripción', () => {
    const m = construir({ ...documento, extracto: { es: '' } }, 'es');

    expect(m.description).toBeUndefined();
  });

  it('si el documento no trae título usa el de respaldo', () => {
    const m = construir({ ...documento, titulo: { es: '' } }, 'es');

    expect(m.title).toBe(`Respaldo | ${SITE_NAME}`);
  });
});

describe('buildAboutMetadata | canonical y hreflang (AC2.7.1, AC2.7.2)', () => {
  it('en español: canonical en español y alternativas es-CO, en y x-default', () => {
    const base = getBaseUrl();
    const m = construir(documento, 'es');

    expect(m.alternates?.canonical).toBe(`${base}/es/nosotros`);
    expect(m.alternates?.languages).toEqual({
      'es-CO': `${base}/es/nosotros`,
      en: `${base}/en/about-us`,
      'x-default': `${base}/es/nosotros`,
    });
  });

  it('en inglés: canonical en inglés y las mismas alternativas', () => {
    const base = getBaseUrl();
    const m = construir(documento, 'en');

    expect(m.alternates?.canonical).toBe(`${base}/en/about-us`);
    expect(m.alternates?.languages).toEqual({
      'es-CO': `${base}/es/nosotros`,
      en: `${base}/en/about-us`,
      'x-default': `${base}/es/nosotros`,
    });
  });
});

describe('buildAboutMetadata | indexación (AC0.4.5)', () => {
  it('con documento y título en inglés se indexan los dos idiomas', () => {
    expect(robots(construir(documento, 'es'))).toEqual({ index: true, follow: true });
    expect(robots(construir(documento, 'en'))).toEqual({ index: true, follow: true });
  });

  it('el inglés sin traducción del título lleva noindex; el español no', () => {
    const sinIngles = { ...documento, titulo: { es: 'Nosotros SAS' } };

    expect(robots(construir(sinIngles, 'en')).index).toBe(false);
    expect(robots(construir(sinIngles, 'es')).index).toBe(true);
  });

  it('un título en inglés en blanco cuenta como sin traducir: noindex en inglés, el español sigue indexado', () => {
    const enBlanco = { ...documento, titulo: { es: 'Nosotros SAS', en: '   ' } };

    expect(robots(construir(enBlanco, 'en')).index).toBe(false);
    expect(robots(construir(enBlanco, 'es')).index).toBe(true);
  });

  it('sin documento no se indexa ningún idioma', () => {
    expect(robots(construir(null, 'es')).index).toBe(false);
    expect(robots(construir(null, 'en')).index).toBe(false);
  });
});
