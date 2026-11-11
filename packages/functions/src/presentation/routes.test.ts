import { describe, expect, it, vi } from 'vitest';

import { apiRouter } from './routes';
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
  presignMediaUpload: { execute: vi.fn() },
  confirmarMediaUpload: { execute: vi.fn() },
} as unknown as UseCases;

const deps: ApiDeps = {
  internalKey: 'clave-prueba',
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  secretComparator: { equals: vi.fn().mockReturnValue(true) },
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
});
