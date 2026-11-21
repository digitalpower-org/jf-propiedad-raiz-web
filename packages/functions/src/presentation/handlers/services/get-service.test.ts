import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';

import { INTERNAL_KEY, setup } from '../../testing/appBuilderTestHarness';
import { API_PATHS } from '../../paths';
import type { ServiceDto } from '../../../application/ports/services-repository';

function makeService(id: string, status: ServiceDto['status'] = 'ACTIVE'): ServiceDto {
  return {
    id,
    slug: `servicio-${id}`,
    status,
    titulo: { es: `Servicio ${id}` },
    resumen: { es: `Resumen ${id}` },
    cuerpo: { es: `Cuerpo ${id}` },
    orden: 0,
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

const servicePath = (idOrSlug: string): string => API_PATHS.service.replace(':idOrSlug', idOrSlug);

describe('GET /api/v1/services/:idOrSlug', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rechaza sin clave interna con 401', async () => {
    const { app } = setup();

    const response = await request(app).get(servicePath('serv-1'));

    expect(response.status).toBe(401);
    expect(response.body.data.code).toBe('UNAUTHORIZED');
  });

  it('responde 200 con servicio ACTIVE sin cabeceras de identidad', async () => {
    const { app, services } = setup();
    vi.mocked(services.obtenerPorIdOSlug).mockResolvedValue({
      service: makeService('serv-1', 'ACTIVE'),
      esPublico: true,
    });

    const response = await request(app)
      .get(servicePath('serv-1'))
      .set('X-Internal-Key', INTERNAL_KEY);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: makeService('serv-1', 'ACTIVE'),
      message: 'Servicio obtenido',
    });
    expect(services.obtenerPorIdOSlug).toHaveBeenCalledWith('serv-1', true, false);
  });

  it('responde 200 con servicio HIDDEN cuando admin + includeHidden=true', async () => {
    const { app, services } = setup();
    vi.mocked(services.obtenerPorIdOSlug).mockResolvedValue({
      service: makeService('serv-3', 'HIDDEN'),
      esPublico: true,
    });

    const response = await request(app)
      .get(servicePath('serv-3'))
      .set('X-Internal-Key', INTERNAL_KEY)
      .set('X-User-Id', 'user-1')
      .set('X-User-Role', 'admin')
      .set('X-User-Email', 'admin@example.com')
      .query({ includeHidden: 'true' });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('HIDDEN');
    expect(services.obtenerPorIdOSlug).toHaveBeenCalledWith('serv-3', true, true);
  });

  it('responde 404 SERVICE_NOT_FOUND para HIDDEN sin includeHidden', async () => {
    const { app, services } = setup();
    vi.mocked(services.obtenerPorIdOSlug).mockResolvedValue({
      service: makeService('serv-3', 'HIDDEN'),
      esPublico: true,
    });

    const response = await request(app)
      .get(servicePath('serv-3'))
      .set('X-Internal-Key', INTERNAL_KEY);

    expect(response.status).toBe(404);
    expect(response.body.data.code).toBe('SERVICE_NOT_FOUND');
  });

  it('responde 404 SERVICE_NOT_FOUND para DELETED aunque includeHidden=true', async () => {
    const { app, services } = setup();
    vi.mocked(services.obtenerPorIdOSlug).mockResolvedValue({
      service: makeService('serv-3', 'DELETED'),
      esPublico: true,
    });

    const response = await request(app)
      .get(servicePath('serv-3'))
      .set('X-Internal-Key', INTERNAL_KEY)
      .set('X-User-Id', 'user-1')
      .set('X-User-Role', 'admin')
      .set('X-User-Email', 'admin@example.com')
      .query({ includeHidden: 'true' });

    expect(response.status).toBe(404);
    expect(response.body.data.code).toBe('SERVICE_NOT_FOUND');
  });

  it('includeHidden=true sin identidad de administrador responde 401 con el mensaje exacto', async () => {
    const { app } = setup();

    const response = await request(app)
      .get(servicePath('serv-3'))
      .set('X-Internal-Key', INTERNAL_KEY)
      .query({ includeHidden: 'true' });

    expect(response.status).toBe(401);
    expect(response.body.data.code).toBe('UNAUTHORIZED');
    expect(response.body.message).toBe(
      'Se requiere sesión de administrador para ver servicios ocultos',
    );
  });

  it('includeHidden con valor invalido responde 422', async () => {
    const { app } = setup();

    const response = await request(app)
      .get(servicePath('serv-3'))
      .set('X-Internal-Key', INTERNAL_KEY)
      .query({ includeHidden: 'yes' });

    expect(response.status).toBe(422);
    expect(response.body.data.code).toBe('VALIDATION_ERROR');
  });
});
