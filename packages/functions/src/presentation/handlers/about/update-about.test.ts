import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';

import { INTERNAL_KEY, setup, verifiedIdentity } from '../../testing/appBuilderTestHarness';
import { API_PATHS } from '../../paths';
import type { AboutDto } from '../../../application/ports/about-repository';
import { ApiError } from '../../../domain/errors/api-error';
import { errorCode } from '../../../domain/errors/errorCatalog';

const aboutDto: AboutDto = {
  titulo: { es: 'Nosotros' },
  extracto: { es: 'Somos una inmobiliaria' },
  secciones: [],
  equipo: [],
  updatedAt: '2026-01-01T00:00:00Z',
};

const validBody = {
  titulo: { es: 'Nosotros actualizado', autoTranslate: true },
  extracto: { es: 'Somos una inmobiliaria actualizada', autoTranslate: true },
  secciones: [
    {
      id: 's1',
      titulo: { es: 'Sección 1', autoTranslate: true },
      cuerpo: { es: 'Cuerpo 1', autoTranslate: true },
    },
  ],
  equipo: [
    {
      id: 'e1',
      nombre: 'Juan',
      cargo: { es: 'Cargo 1', autoTranslate: true },
      descripcion: { es: 'Desc 1', autoTranslate: true },
      foto: 'foto-nueva',
    },
  ],
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

function makeAbout(overrides: Record<string, unknown> = {}) {
  return {
    obtener: vi.fn(),
    guardar: vi.fn(),
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

describe('PUT /api/v1/about', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rechaza sin clave interna con 401', async () => {
    const { app } = setup();

    const response = await request(app).put(API_PATHS.about).send(validBody);

    expect(response.status).toBe(401);
    expect(response.body.data.code).toBe('UNAUTHORIZED');
  });

  it('rechaza sin identidad de usuario con 401', async () => {
    const { app } = setup();

    const response = await request(app)
      .put(API_PATHS.about)
      .set('X-Internal-Key', INTERNAL_KEY)
      .send(validBody);

    expect(response.status).toBe(401);
    expect(response.body.data.code).toBe('UNAUTHORIZED');
  });

  it('responde 200 con el documento actualizado y sobre de éxito', async () => {
    const actualizado: AboutDto = { ...aboutDto, updatedAt: '2026-01-02T00:00:00Z' };
    const { app, about } = setup({
      translator: makeTranslator([
        { fieldPath: 'titulo', translated: 'Nosotros actualizado' },
        { fieldPath: 'extracto', translated: 'Somos una inmobiliaria actualizada' },
        { fieldPath: 'secciones[0].titulo', translated: 'Sección 1' },
        { fieldPath: 'secciones[0].cuerpo', translated: 'Cuerpo 1' },
        { fieldPath: 'equipo[0].cargo', translated: 'Cargo 1' },
        { fieldPath: 'equipo[0].descripcion', translated: 'Desc 1' },
      ]),
      revalidationGateway: makeRevalidationGateway(),
      about: makeAbout({
        obtener: vi.fn().mockResolvedValue(aboutDto),
        guardar: vi.fn().mockResolvedValue(actualizado),
      }),
    });

    const response = await request(app).put(API_PATHS.about).set(authHeaders()).send(validBody);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: actualizado,
      message: 'About actualizado',
    });
    expect(about.guardar).toHaveBeenCalledTimes(1);
  });

  it('rechaza extracto.es mayor a 500 caracteres con 422', async () => {
    const { app, about } = setup();

    const response = await request(app)
      .put(API_PATHS.about)
      .set(authHeaders())
      .send({ ...validBody, extracto: { ...validBody.extracto, es: 'x'.repeat(501) } });

    expect(response.status).toBe(422);
    expect(response.body.data.code).toBe('VALIDATION_ERROR');
    expect(about.guardar).not.toHaveBeenCalled();
  });

  it('mapea conflicto de concurrencia a 409 cuando updatedAt está desactualizado', async () => {
    const { app } = setup({
      translator: makeTranslator([], false),
      revalidationGateway: makeRevalidationGateway(),
      about: makeAbout({
        obtener: vi.fn().mockResolvedValue(aboutDto),
        guardar: vi
          .fn()
          .mockRejectedValue(new ApiError(errorCode.conflict, 'updatedAt desactualizado')),
      }),
    });

    const response = await request(app)
      .put(API_PATHS.about)
      .set(authHeaders())
      .send({ ...validBody, updatedAt: '2026-01-02T00:00:00Z' });

    expect(response.status).toBe(409);
    expect(response.body.data.code).toBe('CONFLICT');
  });
});
