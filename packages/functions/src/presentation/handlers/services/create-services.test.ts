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
  status: 'HIDDEN',
  titulo: { es: 'Servicio 1' },
  resumen: { es: 'Resumen 1' },
  cuerpo: { es: 'Cuerpo 1' },
  orden: 1,
  updatedAt: '2026-01-01T00:00:00Z',
};

const validBody = {
  titulo: { es: 'Servicio 1', autoTranslate: true },
  resumen: { es: 'Resumen 1', autoTranslate: true },
  cuerpo: { es: 'Cuerpo 1', autoTranslate: true },
  fotos: [
    {
      derivados: [
        { clave: 'abc-123-320.webp', ancho: 320, alto: 240 },
        { clave: 'abc-123-640.webp', ancho: 640, alto: 480 },
      ],
    },
  ],
  orden: 1,
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

describe('POST /api/v1/services', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rechaza sin clave interna con 401', async () => {
    const { app } = setup();

    const response = await request(app).post(API_PATHS.services).send(validBody);

    expect(response.status).toBe(401);
    expect(response.body.data.code).toBe('UNAUTHORIZED');
  });

  it('rechaza sin identidad de admin con 401', async () => {
    const { app } = setup();

    const response = await request(app)
      .post(API_PATHS.services)
      .set('X-Internal-Key', INTERNAL_KEY)
      .send(validBody);

    expect(response.status).toBe(401);
    expect(response.body.data.code).toBe('UNAUTHORIZED');
  });

  it('responde 201 con el servicio creado y sobre de éxito', async () => {
    const { app, services } = setup({
      translator: makeTranslator([
        { fieldPath: 'titulo', translated: 'Service 1' },
        { fieldPath: 'resumen', translated: 'Summary 1' },
        { fieldPath: 'cuerpo', translated: 'Body 1' },
      ]),
      revalidationGateway: makeRevalidationGateway(),
      services: makeServices({
        obtenerPorIdOSlug: vi.fn().mockResolvedValue(null),
        crear: vi.fn().mockResolvedValue({ service: serviceDto }),
      }),
    });

    const response = await request(app).post(API_PATHS.services).set(authHeaders()).send(validBody);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      data: serviceDto,
      message: 'Servicio creado',
    });
    expect(services.crear).toHaveBeenCalledTimes(1);
  });

  it('rechaza enPendiente en titulo con 422', async () => {
    const { app, services } = setup();

    const response = await request(app)
      .post(API_PATHS.services)
      .set(authHeaders())
      .send({ ...validBody, titulo: { es: 'Servicio 1', enPendiente: true } });

    expect(response.status).toBe(422);
    expect(response.body.data.code).toBe('VALIDATION_ERROR');
    expect(services.crear).not.toHaveBeenCalled();
  });

  it('rechaza cuerpo obligatorio faltante con 422', async () => {
    const { app } = setup();
    const { cuerpo: _cuerpo, ...sinCuerpo } = validBody;

    const response = await request(app).post(API_PATHS.services).set(authHeaders()).send(sinCuerpo);

    expect(response.status).toBe(422);
    expect(response.body.data.code).toBe('VALIDATION_ERROR');
  });

  it('mapea error de conflicto del caso de uso a 409', async () => {
    const { app, services } = setup();
    vi.mocked(services.crear).mockRejectedValue(
      new ApiError(errorCode.conflict, 'El slug ya está en uso'),
    );

    const response = await request(app).post(API_PATHS.services).set(authHeaders()).send(validBody);

    expect(response.status).toBe(409);
    expect(response.body.data.code).toBe('CONFLICT');
  });
});
