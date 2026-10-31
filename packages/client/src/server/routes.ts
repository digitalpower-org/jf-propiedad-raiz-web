// GENERADO por scripts/gen-routes.mjs — NO EDITAR A MANO.
// Fuente: docs/openapi.bff.yaml
export type RouteAuth = 'public' | 'session' | 'internal';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'TRACE';

export interface BffRoute {
  readonly method: HttpMethod;
  readonly path: string;
  readonly auth: RouteAuth;
  /** null = la ruta se resuelve en el BFF y no se reenvia al backend */
  readonly internalPath: string | null;
}

export const ROUTES = [
  {
    method: 'POST',
    path: '/api/auth/session',
    auth: 'public',
    internalPath: '/internal/auth/verify',
  },
  { method: 'POST', path: '/api/auth/logout', auth: 'public', internalPath: null },
  { method: 'POST', path: '/api/auth/refresh', auth: 'session', internalPath: null },
  { method: 'GET', path: '/api/auth/me', auth: 'session', internalPath: null },
  { method: 'GET', path: '/api/properties', auth: 'public', internalPath: '/api/v1/properties' },
  { method: 'POST', path: '/api/properties', auth: 'session', internalPath: '/api/v1/properties' },
  {
    method: 'GET',
    path: '/api/properties/featured',
    auth: 'public',
    internalPath: '/api/v1/properties/featured',
  },
  {
    method: 'GET',
    path: '/api/properties/{idOrSlug}',
    auth: 'public',
    internalPath: '/api/v1/properties/{idOrSlug}',
  },
  {
    method: 'PUT',
    path: '/api/properties/{idOrSlug}',
    auth: 'session',
    internalPath: '/api/v1/properties/{idOrSlug}',
  },
  {
    method: 'DELETE',
    path: '/api/properties/{idOrSlug}',
    auth: 'session',
    internalPath: '/api/v1/properties/{idOrSlug}',
  },
  {
    method: 'POST',
    path: '/api/properties/{idOrSlug}/activate',
    auth: 'session',
    internalPath: '/api/v1/properties/{idOrSlug}/activate',
  },
  {
    method: 'POST',
    path: '/api/properties/{idOrSlug}/hide',
    auth: 'session',
    internalPath: '/api/v1/properties/{idOrSlug}/hide',
  },
  {
    method: 'POST',
    path: '/api/media/presigned-url',
    auth: 'session',
    internalPath: '/api/v1/media/presigned-url',
  },
  {
    method: 'POST',
    path: '/api/media/confirm',
    auth: 'session',
    internalPath: '/api/v1/media/confirm',
  },
  {
    method: 'POST',
    path: '/api/consignments',
    auth: 'public',
    internalPath: '/api/v1/consignments',
  },
  { method: 'GET', path: '/api/services', auth: 'public', internalPath: '/api/v1/services' },
  { method: 'POST', path: '/api/services', auth: 'session', internalPath: '/api/v1/services' },
  {
    method: 'GET',
    path: '/api/services/{idOrSlug}',
    auth: 'public',
    internalPath: '/api/v1/services/{idOrSlug}',
  },
  {
    method: 'PUT',
    path: '/api/services/{idOrSlug}',
    auth: 'session',
    internalPath: '/api/v1/services/{idOrSlug}',
  },
  {
    method: 'DELETE',
    path: '/api/services/{idOrSlug}',
    auth: 'session',
    internalPath: '/api/v1/services/{idOrSlug}',
  },
  {
    method: 'POST',
    path: '/api/services/{idOrSlug}/activate',
    auth: 'session',
    internalPath: '/api/v1/services/{idOrSlug}/activate',
  },
  {
    method: 'POST',
    path: '/api/services/{idOrSlug}/hide',
    auth: 'session',
    internalPath: '/api/v1/services/{idOrSlug}/hide',
  },
  {
    method: 'POST',
    path: '/api/services/reorder',
    auth: 'session',
    internalPath: '/api/v1/services/reorder',
  },
  { method: 'GET', path: '/api/about', auth: 'public', internalPath: '/api/v1/about' },
  { method: 'PUT', path: '/api/about', auth: 'session', internalPath: '/api/v1/about' },
  { method: 'POST', path: '/api/revalidate', auth: 'internal', internalPath: null },
  { method: 'GET', path: '/api/health', auth: 'public', internalPath: null },
] as const satisfies readonly BffRoute[];
