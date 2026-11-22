import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';

import { INTERNAL_KEY, setup, verifiedIdentity } from '../../testing/appBuilderTestHarness';
import { API_PATHS } from '../../paths';

function authHeaders() {
  return {
    'X-Internal-Key': INTERNAL_KEY,
    'X-User-Id': verifiedIdentity.uid,
    'X-User-Role': 'admin',
    'X-User-Email': verifiedIdentity.email,
  };
}

function makeServices(overrides: Record<string, unknown> = {}) {
  return {
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
    activar: vi.fn(),
    ocultar: vi.fn(),
    reordenar: vi.fn(),
    obtenerPorIdOSlug: vi.fn(),
    listarPaginado: vi.fn(),
    ...overrides,
  };
}

function makeRevalidationGateway() {
  return { revalidate: vi.fn().mockResolvedValue({ ok: true }) };
}

describe('POST /api/v1/services/reorder', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rechaza sin clave interna con 401', async () => {
    const { app } = setup();

    const response = await request(app)
      .post(API_PATHS.reorderServices)
      .send({ orden: ['svc-1', 'svc-2'] });

    expect(response.status).toBe(401);
    expect(response.body.data.code).toBe('UNAUTHORIZED');
  });

  it('responde 200 con los IDs en el nuevo orden y sobre de éxito', async () => {
    const { app, services } = setup({
      revalidationGateway: makeRevalidationGateway(),
      services: makeServices({
        reordenar: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const response = await request(app)
      .post(API_PATHS.reorderServices)
      .set(authHeaders())
      .send({ orden: ['svc-2', 'svc-1'] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { orden: ['svc-2', 'svc-1'] },
      message: 'Servicios reordenados',
    });
    expect(services.reordenar).toHaveBeenCalledTimes(1);
    expect(services.reordenar).toHaveBeenCalledWith([
      { id: 'svc-2', orden: 0 },
      { id: 'svc-1', orden: 1 },
    ]);
  });

  it('rechaza orden vacía con 422', async () => {
    const { app, services } = setup({
      services: makeServices(),
    });

    const response = await request(app)
      .post(API_PATHS.reorderServices)
      .set(authHeaders())
      .send({ orden: [] });

    expect(response.status).toBe(422);
    expect(response.body.data.code).toBe('VALIDATION_ERROR');
    expect(services.reordenar).not.toHaveBeenCalled();
  });
});
