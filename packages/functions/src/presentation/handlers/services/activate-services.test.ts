import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { INTERNAL_KEY, setup, verifiedIdentity } from '../../testing/appBuilderTestHarness';
import { API_PATHS } from '../../paths';
import type { ServiceDto } from '../../../application/ports/services-repository';
import { ApiError } from '../../../domain/errors/api-error';
import { errorCode } from '../../../domain/errors/errorCatalog';

const serviceDto: ServiceDto = {
  id: 'svc-1',
  slug: 'servicio-1',
  status: 'ACTIVE',
  titulo: { es: 'Servicio 1' },
  resumen: { es: 'Resumen 1' },
  cuerpo: { es: 'Cuerpo 1' },
  orden: 1,
  updatedAt: '2026-01-01T00:00:00Z',
};

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

describe('POST /api/v1/services/{idOrSlug}/activate', () => {
  it('rechaza sin clave interna con 401', async () => {
    const { app } = setup();

    const response = await request(app).post(
      API_PATHS.activateService.replace(':idOrSlug', 'svc-1'),
    );

    expect(response.status).toBe(401);
    expect(response.body.data.code).toBe('UNAUTHORIZED');
  });

  it('responde 200 con el servicio activado y sobre de éxito', async () => {
    const { app, services } = setup({
      revalidationGateway: makeRevalidationGateway(),
      services: makeServices({
        activar: vi.fn().mockImplementation(async () => ({ service: serviceDto })),
      }),
    });

    const response = await request(app)
      .post(API_PATHS.activateService.replace(':idOrSlug', 'svc-1'))
      .set(authHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { id: 'svc-1' },
      message: 'Servicio activado',
    });
    expect(services.activar).toHaveBeenCalledTimes(1);
  });

  it('mapea servicio no encontrado a 404', async () => {
    const { app, services } = setup({
      revalidationGateway: makeRevalidationGateway(),
      services: makeServices({
        activar: vi
          .fn()
          .mockRejectedValue(
            new ApiError(errorCode.serviceNotFound, 'Servicio no encontrado: svc-1'),
          ),
      }),
    });

    const response = await request(app)
      .post(API_PATHS.activateService.replace(':idOrSlug', 'svc-1'))
      .set(authHeaders());

    expect(response.status).toBe(404);
    expect(response.body.data.code).toBe('SERVICE_NOT_FOUND');
    expect(services.activar).toHaveBeenCalledTimes(1);
  });
});
