/**
 * Fuente única de las rutas públicas por idioma (US0.4, AC0.4.1).
 *
 * Los segmentos se traducen (`/es/venta` ↔ `/en/sale`), por eso no basta con
 * anteponer el idioma: el mapa es bidireccional y vive aquí.
 * Las rutas dinámicas usan `[slug]`; el slug es el mismo en ambos idiomas
 * (AC0.4.7), solo cambia la parte literal de la ruta.
 */

import { defaultLocale, isLocale, type Locale } from './config';

export const routes = {
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
} as const satisfies Record<string, Record<Locale, string>>;

export type RouteKey = keyof typeof routes;

/** Parámetros de ruta ya resueltos (`slug`, …). */
export type RouteParams = Readonly<Record<string, string>>;

export type ParsedPath = {
  readonly key: RouteKey;
  readonly params: RouteParams;
};

const routeKeys = Object.keys(routes) as RouteKey[];

const PLACEHOLDER = /\[([^\]]+)\]/g;

function normalize(pathname: string): string {
  const path = pathname.split(/[?#]/)[0] ?? pathname;
  const trimmed = path.length > 1 ? path.replace(/\/+$/, '') : path;
  return trimmed === '' ? '/' : trimmed;
}

function splitSegments(path: string): string[] {
  return path.split('/').filter((segment) => segment.length > 0);
}

/** Construye la ruta de `key` en `locale`, sustituyendo `[param]`. */
export function getRoute(key: RouteKey, locale: Locale, params: RouteParams = {}): string {
  const template: string = routes[key][locale];
  return template.replace(PLACEHOLDER, (_match, name: string) => {
    const value = params[name];
    if (value === undefined || value === '') {
      throw new Error(`Falta el parámetro "${name}" para la ruta "${key}" (${locale})`);
    }
    return encodeURIComponent(value);
  });
}

/** Resuelve un pathname a su clave de ruta y parámetros, o `null` si no existe. */
export function parsePath(pathname: string): ParsedPath | null {
  const segments = splitSegments(normalize(pathname));
  const localeSegment = segments[0];
  if (!isLocale(localeSegment)) return null;

  for (const key of routeKeys) {
    const templateSegments = splitSegments(routes[key][localeSegment]);
    if (templateSegments.length !== segments.length) continue;

    const params: Record<string, string> = {};
    let matches = true;

    for (let index = 0; index < templateSegments.length; index += 1) {
      const template = templateSegments[index];
      const actual = segments[index];
      if (template === undefined || actual === undefined) {
        matches = false;
        break;
      }
      if (template.startsWith('[') && template.endsWith(']')) {
        params[template.slice(1, -1)] = decodeURIComponent(actual);
      } else if (template !== actual) {
        matches = false;
        break;
      }
    }

    if (matches) return { key, params };
  }

  return null;
}

/**
 * Ruta equivalente en `targetLocale`, conservando el slug y la query
 * (filtros). Si el pathname no se reconoce, devuelve la portada del idioma
 * destino (AC0.4.3).
 */
export function getEquivalentPath(pathname: string, search: string, targetLocale: Locale): string {
  const parsed = parsePath(pathname);
  if (parsed === null) return routes.home[targetLocale];

  const base = getRoute(parsed.key, targetLocale, parsed.params);
  if (search === '') return base;
  return `${base}${search.startsWith('?') ? search : `?${search}`}`;
}

/** Ruta de la portada, usada como destino seguro cuando no hay match. */
export function homePath(locale: Locale = defaultLocale): string {
  return routes.home[locale];
}
