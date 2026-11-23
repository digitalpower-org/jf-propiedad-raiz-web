import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';

import { INTERNAL_KEY, setup } from '../../testing/appBuilderTestHarness';
import { API_PATHS } from '../../paths';
import type { ServiceCardDto } from '../../../application/ports/services-repository';

function makeServiceCard(id: string, orden: number): ServiceCardDto {
  return {
    id,
    slug: `servicio-${id}`,
    titulo: { es: `Servicio ${id}` },
    resumen: { es: `Resumen ${id}` },
    orden,
  };
}

describe('GET /api/v1/services', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rechaza sin clave interna con 401', async () => {
    const { app } = setup();

    const response = await request(app).get(API_PATHS.services);

    expect(response.status).toBe(401);
    expect(response.body.data.code).toBe('UNAUTHORIZED');
  });

  it('responde 200 con items paginados y sobre de éxito', async () => {
    const { app, services } = setup();
    const items = [makeServiceCard('svc-1', 1), makeServiceCard('svc-2', 2)];
    vi.mocked(services.listarPaginado).mockResolvedValue({ items, nextCursor: undefined });

    const response = await request(app).get(API_PATHS.services).set('X-Internal-Key', INTERNAL_KEY);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { items, nextCursor: undefined },
      message: 'Listado de servicios',
    });
    expect(services.listarPaginado).toHaveBeenCalledWith({
      cursor: undefined,
      limit: undefined,
      includeHidden: false,
    });
  });

  it('pasa cursor y límite al caso de uso', async () => {
    const { app, services } = setup();
    const items = [makeServiceCard('svc-1', 1)];
    vi.mocked(services.listarPaginado).mockResolvedValue({ items, nextCursor: undefined });

    const response = await request(app)
      .get(API_PATHS.services)
      .set('X-Internal-Key', INTERNAL_KEY)
      .query({ cursor: 'cursor-1', limit: '12' });

    expect(response.status).toBe(200);
    expect(services.listarPaginado).toHaveBeenCalledWith({
      cursor: 'cursor-1',
      limit: 12,
      includeHidden: false,
    });
  });

  it('paginación: 13 elementos devuelve 12 con nextCursor', async () => {
    const { app, services } = setup();
    const items = Array.from({ length: 12 }, (_, i) => makeServiceCard(`svc-${i + 1}`, i + 1));
    vi.mocked(services.listarPaginado).mockResolvedValue({
      items,
      nextCursor: 'cursor-pagina-2',
    });

    const response = await request(app)
      .get(API_PATHS.services)
      .set('X-Internal-Key', INTERNAL_KEY)
      .query({ limit: '12' });

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(12);
    expect(response.body.data.nextCursor).toBe('cursor-pagina-2');
    expect(services.listarPaginado).toHaveBeenCalledWith({
      cursor: undefined,
      limit: 12,
      includeHidden: false,
    });
  });

  it('rechaza limit mayor a 50 con 422', async () => {
    const { app } = setup();

    const response = await request(app)
      .get(API_PATHS.services)
      .set('X-Internal-Key', INTERNAL_KEY)
      .query({ limit: '51' });

    expect(response.status).toBe(422);
    expect(response.body.data.code).toBe('VALIDATION_ERROR');
  });

  it('rechaza limit menor a 1 con 422', async () => {
    const { app } = setup();

    const response = await request(app)
      .get(API_PATHS.services)
      .set('X-Internal-Key', INTERNAL_KEY)
      .query({ limit: '0' });

    expect(response.status).toBe(422);
    expect(response.body.data.code).toBe('VALIDATION_ERROR');
  });

  it('includeHidden=true sin identidad de administrador responde 401 con el mensaje exacto', async () => {
    const { app } = setup();

    const response = await request(app)
      .get(API_PATHS.services)
      .set('X-Internal-Key', INTERNAL_KEY)
      .query({ includeHidden: 'true' });

    expect(response.status).toBe(401);
    expect(response.body.data.code).toBe('UNAUTHORIZED');
    expect(response.body.message).toBe(
      'Se requiere sesión de administrador para ver servicios ocultos',
    );
  });

  it('includeHidden=true con identidad de administrador responde 200 y el repositorio recibe includeHidden', async () => {
    const { app, services } = setup();
    const items = [makeServiceCard('svc-1', 1)];
    vi.mocked(services.listarPaginado).mockResolvedValue({ items, nextCursor: undefined });

    const response = await request(app)
      .get(API_PATHS.services)
      .set('X-Internal-Key', INTERNAL_KEY)
      .set('X-User-Id', 'user-1')
      .set('X-User-Role', 'admin')
      .set('X-User-Email', 'admin@example.com')
      .query({ includeHidden: 'true' });

    expect(response.status).toBe(200);
    expect(services.listarPaginado).toHaveBeenCalledWith({
      cursor: undefined,
      limit: undefined,
      includeHidden: true,
    });
  });

  it('includeHidden con valor invalido responde 422', async () => {
    const { app } = setup();

    const response = await request(app)
      .get(API_PATHS.services)
      .set('X-Internal-Key', INTERNAL_KEY)
      .query({ includeHidden: 'yes' });

    expect(response.status).toBe(422);
    expect(response.body.data.code).toBe('VALIDATION_ERROR');
  });
});
