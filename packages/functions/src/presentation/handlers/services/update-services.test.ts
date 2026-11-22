import { describe, expect, it, vi, beforeEach } from 'vitest';
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

const validBody = {
  titulo: { es: 'Servicio 1 actualizado', autoTranslate: true },
  resumen: { es: 'Resumen 1 actualizado', autoTranslate: true },
  cuerpo: { es: 'Cuerpo 1 actualizado', autoTranslate: true },
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

function makeTranslator(
  outputs: { fieldPath: string; translated: string }[] = [],
  hasErrors = false,
) {
  return {
    translate: vi.fn().mockResolvedValue({ outputs, hasErrors }),
  };
}

describe('PUT /api/v1/services/{idOrSlug}', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rechaza sin clave interna con 401', async () => {
    const { app } = setup();

    const response = await request(app)
      .put(API_PATHS.service.replace(':idOrSlug', 'svc-1'))
      .send(validBody);

    expect(response.status).toBe(401);
    expect(response.body.data.code).toBe('UNAUTHORIZED');
  });

  it('responde 200 con el servicio actualizado y sobre de éxito', async () => {
    const { app, services } = setup({
      translator: makeTranslator([
        { fieldPath: 'titulo', translated: 'Service 1 updated' },
        { fieldPath: 'resumen', translated: 'Summary 1 updated' },
        { fieldPath: 'cuerpo', translated: 'Body 1 updated' },
      ]),
      revalidationGateway: makeRevalidationGateway(),
      services: makeServices({
        obtenerPorIdOSlug: vi.fn().mockResolvedValue({ service: serviceDto, esPublico: false }),
        actualizar: vi.fn().mockResolvedValue({ service: serviceDto }),
      }),
    });

    const response = await request(app)
      .put(API_PATHS.service.replace(':idOrSlug', 'svc-1'))
      .set(authHeaders())
      .send(validBody);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: serviceDto,
      message: 'Servicio actualizado',
    });
    expect(services.actualizar).toHaveBeenCalledTimes(1);
  });

  it('rechaza enPendiente en titulo con 422', async () => {
    const { app, services } = setup();

    const response = await request(app)
      .put(API_PATHS.service.replace(':idOrSlug', 'svc-1'))
      .set(authHeaders())
      .send({ ...validBody, titulo: { es: 'Servicio 1', enPendiente: true } });

    expect(response.status).toBe(422);
    expect(response.body.data.code).toBe('VALIDATION_ERROR');
    expect(services.actualizar).not.toHaveBeenCalled();
  });

  it('mapea servicio no encontrado a 404', async () => {
    const { app, services } = setup();
    vi.mocked(services.actualizar).mockRejectedValue(
      new ApiError(errorCode.serviceNotFound, 'Servicio no encontrado: svc-1'),
    );

    const response = await request(app)
      .put(API_PATHS.service.replace(':idOrSlug', 'svc-1'))
      .set(authHeaders())
      .send(validBody);

    expect(response.status).toBe(404);
    expect(response.body.data.code).toBe('SERVICE_NOT_FOUND');
  });

  it('mapea conflicto de concurrencia a 409', async () => {
    const { app } = setup({
      translator: makeTranslator([], false),
      revalidationGateway: makeRevalidationGateway(),
      services: makeServices({
        obtenerPorIdOSlug: vi.fn().mockResolvedValue({ service: serviceDto, esPublico: false }),
        actualizar: vi
          .fn()
          .mockRejectedValue(new ApiError(errorCode.conflict, 'updatedAt desactualizado')),
      }),
    });

    const response = await request(app)
      .put(API_PATHS.service.replace(':idOrSlug', 'svc-1'))
      .set(authHeaders())
      .send(validBody);

    expect(response.status).toBe(409);
    expect(response.body.data.code).toBe('CONFLICT');
  });

  it('rechaza body sin updatedAt con 422 (Política OCC estricta)', async () => {
    const { app, services } = setup();

    const { updatedAt: _updatedAt, ...sinUpdatedAt } = validBody;
    const response = await request(app)
      .put(API_PATHS.service.replace(':idOrSlug', 'svc-1'))
      .set(authHeaders())
      .send(sinUpdatedAt);

    expect(response.status).toBe(422);
    expect(response.body.data.code).toBe('VALIDATION_ERROR');
    expect(services.actualizar).not.toHaveBeenCalled();
  });

  it('rechaza campos extra con 422 por body strict', async () => {
    const { app, services } = setup();

    const response = await request(app)
      .put(API_PATHS.service.replace(':idOrSlug', 'svc-1'))
      .set(authHeaders())
      .send({ ...validBody, campoExtra: 'no' });

    expect(response.status).toBe(422);
    expect(response.body.data.code).toBe('VALIDATION_ERROR');
    expect(services.actualizar).not.toHaveBeenCalled();
  });

  it('acepta PUT parcial con solo updatedAt y un campo', async () => {
    const { app, services } = setup({
      translator: makeTranslator([], false),
      revalidationGateway: makeRevalidationGateway(),
      services: makeServices({
        obtenerPorIdOSlug: vi.fn().mockResolvedValue({ service: serviceDto, esPublico: false }),
        actualizar: vi.fn().mockResolvedValue({ service: serviceDto }),
      }),
    });

    const response = await request(app)
      .put(API_PATHS.service.replace(':idOrSlug', 'svc-1'))
      .set(authHeaders())
      .send({ orden: 3, updatedAt: '2026-01-01T00:00:00Z' });

    expect(response.status).toBe(200);
    expect(services.actualizar).toHaveBeenCalledWith(
      'svc-1',
      expect.objectContaining({ orden: 3 }),
      '2026-01-01T00:00:00Z',
    );
  });
});
