import { ROUTES, type BffRoute, type HttpMethod } from './routes';

export type RouteMatch =
  | { readonly kind: 'match'; readonly route: BffRoute }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'method-not-allowed'; readonly allow: readonly HttpMethod[] };

function normalize(pathname: string): string {
  const withoutQuery = pathname.split(/[?#]/)[0] ?? pathname;
  if (withoutQuery.length <= 1) return '/';
  return withoutQuery.replace(/\/+$/, '');
}

function splitSegments(path: string): string[] {
  return path.split('/').filter((segment) => segment.length > 0);
}

function patternSegments(pattern: string): string[] {
  return splitSegments(pattern);
}

function matchesPattern(pattern: string, segments: string[]): boolean {
  const expected = patternSegments(pattern);
  if (expected.length !== segments.length) return false;

  return expected.every((segment, index) => {
    if (segment.startsWith('{') && segment.endsWith('}')) return true;
    return segment === segments[index];
  });
}

function literalSegments(pattern: string): number {
  return patternSegments(pattern).filter((segment) => !segment.startsWith('{')).length;
}

/**
 * Resolución *path-first* del catálogo (AC0.1.6): el segmento literal gana al
 * dinámico y el método se comprueba sobre el patrón ya resuelto. Así
 * `PUT /api/properties/featured` es 405 (existe `GET featured`), no se cuela por
 * `/api/properties/{idOrSlug}`.
 */
export function matchRoute(method: string, pathname: string): RouteMatch {
  const segments = splitSegments(normalize(pathname));
  const candidates = ROUTES.filter((route) => matchesPattern(route.path, segments));

  if (candidates.length === 0) return { kind: 'not-found' };

  const mostSpecific = Math.max(...candidates.map((route) => literalSegments(route.path)));
  const resolved = candidates.filter((route) => literalSegments(route.path) === mostSpecific);

  const route = resolved.find((candidate) => candidate.method === method);
  if (route !== undefined) return { kind: 'match', route };

  const allow: HttpMethod[] = [];
  for (const candidate of resolved) {
    if (!allow.includes(candidate.method)) allow.push(candidate.method);
  }

  return { kind: 'method-not-allowed', allow: allow.sort() };
}
