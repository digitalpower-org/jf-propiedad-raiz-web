import { describe, expect, it, vi } from 'vitest';

import { apiRouter } from './routes';
import { API_PATHS, OPS_PATHS } from './paths';
import type { UseCases } from '../application/buildUseCases';
import type { ApiDeps } from './appBuilder';

const useCases = {
  verifyInternalSession: { execute: vi.fn() },
  crearProperty: { execute: vi.fn() },
  actualizarProperty: { execute: vi.fn() },
  eliminarProperty: { execute: vi.fn() },
  activarProperty: { execute: vi.fn() },
  ocultarProperty: { execute: vi.fn() },
  listarProperties: { execute: vi.fn() },
  obtenerProperty: { execute: vi.fn() },
  obtenerService: { execute: vi.fn() },
  obtenerAbout: { execute: vi.fn() },
  actualizarAbout: { execute: vi.fn() },
  presignMediaUpload: { execute: vi.fn() },
  confirmarMediaUpload: { execute: vi.fn() },
} as unknown as UseCases;

const deps: ApiDeps = {
  internalKey: 'clave-prueba',
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  secretComparator: { equals: vi.fn().mockReturnValue(true) },
};

// Número y orden esperado de guards por ruta (método:path → nombres de guard).
// El handler (anónimo) no se incluye; solo los guards registrados.
const expectedGuards: Record<string, readonly string[]> = {
  [`post:${API_PATHS.verifyInternalSession}`]: ['guard-internal', 'rate-verify-internal-session'],
  [`get:${OPS_PATHS.health}`]: ['rate-health'],
  [`post:${API_PATHS.consignments}`]: ['guard-internal', 'require-client-ip', 'rate-consignment'],
  [`post:${API_PATHS.properties}`]: ['guard-internal', 'require-user-identity', 'rate-admin-write'],
  [`put:${API_PATHS.property}`]: ['guard-internal', 'require-user-identity', 'rate-admin-write'],
  [`delete:${API_PATHS.property}`]: ['guard-internal', 'require-user-identity', 'rate-admin-write'],
  [`post:${API_PATHS.activateProperty}`]: [
    'guard-internal',
    'require-user-identity',
    'rate-admin-write',
  ],
  [`post:${API_PATHS.hideProperty}`]: [
    'guard-internal',
    'require-user-identity',
    'rate-admin-write',
  ],
  [`get:${API_PATHS.properties}`]: [
    'guard-internal',
    'optional-admin-identity',
    'rate-public-properties-list',
  ],
  [`get:${API_PATHS.featuredProperties}`]: ['guard-internal', 'rate-public-featured'],
  [`get:${API_PATHS.property}`]: [
    'guard-internal',
    'optional-admin-identity',
    'rate-public-property-detail',
  ],
  [`get:${API_PATHS.services}`]: [
    'guard-internal',
    'optional-admin-identity',
    'rate-public-services',
  ],
  [`get:${API_PATHS.service}`]: [
    'guard-internal',
    'optional-admin-identity',
    'rate-public-service-detail',
  ],
  [`post:${API_PATHS.services}`]: ['guard-internal', 'require-user-identity', 'rate-admin-write'],
  [`put:${API_PATHS.service}`]: ['guard-internal', 'require-user-identity', 'rate-admin-write'],
  [`delete:${API_PATHS.service}`]: ['guard-internal', 'require-user-identity', 'rate-admin-write'],
  [`post:${API_PATHS.activateService}`]: [
    'guard-internal',
    'require-user-identity',
    'rate-admin-write',
  ],
  [`post:${API_PATHS.hideService}`]: [
    'guard-internal',
    'require-user-identity',
    'rate-admin-write',
  ],
  [`post:${API_PATHS.reorderServices}`]: [
    'guard-internal',
    'require-user-identity',
    'rate-admin-write',
  ],
  [`get:${API_PATHS.about}`]: ['guard-internal', 'rate-public-about'],
  [`put:${API_PATHS.about}`]: ['guard-internal', 'require-user-identity', 'rate-admin-write'],
  [`post:${API_PATHS.presignedMediaUrl}`]: [
    'guard-internal',
    'require-user-identity',
    'rate-media-presign',
  ],
  [`post:${API_PATHS.confirmMedia}`]: [
    'guard-internal',
    'require-user-identity',
    'rate-media-confirm',
  ],
  [`post:${API_PATHS.resendDeliveryWebhook}`]: [],
  [`get:${API_PATHS.consignmentEmailNotifications}`]: [
    'guard-internal',
    'rate-email-notifications',
  ],
};

describe('apiRouter', () => {
  it('devuelve un Router con las rutas registradas', () => {
    const router = apiRouter(useCases, deps);

    const paths = router.stack
      .flatMap((layer) => {
        const route = (layer as { route?: { path: string } }).route;
        return route ? [route.path] : [];
      })
      .filter(Boolean);

    expect(paths).toContain('/internal/auth/verify');
    expect(paths).toContain('/api/v1/properties');
    expect(paths).toContain('/health');
    expect(paths.length).toBeGreaterThan(0);
  });

  it('registra el número y orden de guards por nombre en las 25 rutas', () => {
    const router = apiRouter(useCases, deps);

    const actual: Record<string, string[]> = {};
    for (const layer of router.stack) {
      const route = layer.route;
      if (!route) continue;
      // router.all(path, methodNotAllowed) crea capas con método indefinido; se ignoran.
      const subLayers = route.stack.filter((sub) => sub.method);
      if (subLayers.length === 0) continue;
      const method = subLayers[0].method;
      // El handler es la última capa y es anónimo; solo se comparan los guards.
      const guards = subLayers.map((sub) => sub.handle.name).slice(0, -1);
      actual[`${method}:${route.path}`] = guards;
    }

    for (const [key, expected] of Object.entries(expectedGuards)) {
      expect(actual[key], `ruta ${key}`).toEqual(expected);
    }
    // Ninguna ruta de más ni de menos: exactamente las 25 esperadas.
    expect(Object.keys(actual).sort()).toEqual(Object.keys(expectedGuards).sort());
  });
});
