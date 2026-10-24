import { describe, expect, it } from 'vitest';

import { defaultLocale, isLocale, locales } from './config';
import { getEquivalentPath, getRoute, parsePath, routes, type RouteKey } from './routes';

const routeKeys = Object.keys(routes) as RouteKey[];

function paramsFor(template: string): Record<string, string> {
  return template.includes('[slug]') ? { slug: 'casa-arboleda' } : {};
}

describe('rutas por idioma', () => {
  it('cubre las 13 rutas del contrato (AC0.4.1)', () => {
    expect(routeKeys).toHaveLength(13);
  });

  it('construye y vuelve a parsear cada ruta en cada idioma', () => {
    for (const key of routeKeys) {
      for (const locale of locales) {
        const params = paramsFor(routes[key][locale]);
        const path = getRoute(key, locale, params);

        expect(parsePath(path)).toEqual({ key, params });
      }
    }
  });

  it('traduce los segmentos literales y conserva el slug (AC0.4.7)', () => {
    expect(getRoute('sale', 'es')).toBe('/es/venta');
    expect(getRoute('sale', 'en')).toBe('/en/sale');
    expect(getRoute('property', 'en', { slug: 'casa-1' })).toBe('/en/property/casa-1');
    expect(parsePath('/es/propiedad/casa-1')).toEqual({
      key: 'property',
      params: { slug: 'casa-1' },
    });
  });

  it('escapa el slug al construir la ruta', () => {
    expect(getRoute('property', 'es', { slug: 'casa con patio' })).toBe(
      '/es/propiedad/casa%20con%20patio',
    );
  });

  it('falla si falta un parámetro obligatorio', () => {
    expect(() => getRoute('property', 'es')).toThrow(/slug/);
  });

  it('acepta la barra final', () => {
    expect(parsePath('/es/venta/')).toEqual({ key: 'sale', params: {} });
  });

  it('no reconoce idiomas no soportados ni rutas inexistentes', () => {
    expect(parsePath('/fr/venta')).toBeNull();
    expect(parsePath('/fr')).toBeNull();
    expect(parsePath('/')).toBeNull();
    expect(parsePath('/es/no-existe')).toBeNull();
  });

  it('produce la ruta equivalente conservando la query', () => {
    expect(getEquivalentPath('/es/venta', '', 'en')).toBe('/en/sale');
    expect(getEquivalentPath('/es/venta', '?page=2', 'en')).toBe('/en/sale?page=2');
    expect(getEquivalentPath('/es/propiedad/casa-1', '', 'en')).toBe('/en/property/casa-1');
  });

  it('cae en la portada del idioma destino cuando no hay match', () => {
    expect(getEquivalentPath('/fr/venta', '', 'en')).toBe(routes.home.en);
    expect(getEquivalentPath('/', '', 'es')).toBe(routes.home.es);
  });
});

describe('configuración de idiomas', () => {
  it('usa español por defecto (AC0.4.2)', () => {
    expect(defaultLocale).toBe('es');
  });

  it('valida solo idiomas soportados', () => {
    expect(isLocale('es')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});
