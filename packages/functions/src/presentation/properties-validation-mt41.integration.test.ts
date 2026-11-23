import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';

import { INTERNAL_KEY, setup, verifiedIdentity, makePorts } from './testing/appBuilderTestHarness';
import { API_PATHS } from './paths';
import type { PropertyDto } from '../application/ports/properties-repository';
import type { RevalidationGateway } from '../application/ports/revalidation-gateway';

const validPropertyDto: PropertyDto = {
  id: 'prop-123',
  codigo: 'JF-0001',
  slug: 'casa-en-venta-medellin',
  status: 'HIDDEN',
  operacion: 'VENTA',
  tipo: 'CASA',
  titulo: { es: 'Casa en venta' },
  precio: 150000000,
  departamento: 'Antioquia',
  municipio: 'Medellín',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
  destacada: false,
};

const validCreateBody = {
  operacion: 'VENTA',
  tipo: 'CASA',
  titulo: { es: 'Casa en venta' },
  precio: 150000000,
  departamento: 'Antioquia',
  municipio: 'Medellín',
};

function makeRevalidationGateway(
  overrides: Partial<RevalidationGateway> = {},
): RevalidationGateway {
  return {
    revalidate: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  };
}

function makeRateLimiter() {
  return {
    check: vi.fn().mockResolvedValue({ allowed: true, retryAfter: undefined }),
  };
}

function makePropertiesRepository(
  overrides: Partial<ReturnType<typeof makePorts>['properties']> = {},
) {
  return {
    create: vi.fn().mockResolvedValue({ property: { ...validPropertyDto, status: 'HIDDEN' } }),
    findByIdOrSlug: vi.fn(),
    listPublico: vi.fn().mockResolvedValue({ items: [], nextCursor: undefined }),
    getFeatured: vi.fn(),
    update: vi.fn().mockResolvedValue({
      property: {
        ...validPropertyDto,
        updatedAt: '2024-01-15T11:00:00.000Z',
      },
    }),
    activate: vi.fn().mockResolvedValue({
      property: {
        ...validPropertyDto,
        status: 'ACTIVE',
        fechaPublicacion: '2024-01-15T11:00:00.000Z',
      },
      primeraActivacion: true,
      fechaPublicacion: '2024-01-15T11:00:00.000Z',
    }),
    hide: vi.fn().mockResolvedValue({ property: { ...validPropertyDto, status: 'HIDDEN' } }),
    softDelete: vi.fn().mockResolvedValue({ property: { ...validPropertyDto, status: 'DELETED' } }),
    ...overrides,
  };
}

function makeIdentityVerifier() {
  return {
    verify: vi.fn().mockResolvedValue(verifiedIdentity),
  };
}

function makeAuthorizedUsers() {
  return {
    findActiveByEmail: vi.fn().mockResolvedValue({ email: 'admin@example.com', role: 'admin' }),
  };
}

function makeBasePorts() {
  return makePorts({
    revalidationGateway: makeRevalidationGateway(),
    rateLimiter: makeRateLimiter(),
    properties: makePropertiesRepository(),
    identityVerifier: makeIdentityVerifier(),
    authorizedUsers: makeAuthorizedUsers(),
  });
}

function authHeaders(requestId = 'req-test-123') {
  return {
    'X-Internal-Key': INTERNAL_KEY,
    'X-User-Id': verifiedIdentity.uid,
    'X-User-Role': 'admin',
    'X-User-Email': verifiedIdentity.email,
    'X-Request-Id': requestId,
  };
}

function publicHeaders(requestId = 'req-test-123') {
  return {
    'X-Internal-Key': INTERNAL_KEY,
    'X-Request-Id': requestId,
  };
}

describe('Properties validation integration (MT4.1 P1)', () => {
  let basePorts: ReturnType<typeof makeBasePorts>;

  beforeEach(() => {
    vi.resetAllMocks();
    basePorts = makeBasePorts();
  });

  describe('POST /api/v1/properties — create validation', () => {
    it('responde 422 cuando se envían más de 2 videos', async () => {
      const { app } = setup(basePorts);

      const response = await request(app)
        .post(API_PATHS.properties)
        .set(authHeaders())
        .send({
          ...validCreateBody,
          videos: ['https://youtu.be/v1', 'https://youtu.be/v2', 'https://youtu.be/v3'],
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.data.code).toBe('VALIDATION_ERROR');
    });

    it('responde 201 cuando se envían exactamente 2 videos', async () => {
      const { app, properties } = setup(basePorts);

      const response = await request(app)
        .post(API_PATHS.properties)
        .set(authHeaders())
        .send({
          ...validCreateBody,
          videos: ['https://youtu.be/v1', 'https://youtu.be/v2'],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(properties.create).toHaveBeenCalledTimes(1);
    });

    it('responde 422 cuando fechaEntregaEstimada no tiene formato AAAA-MM', async () => {
      const { app } = setup(basePorts);

      const response = await request(app)
        .post(API_PATHS.properties)
        .set(authHeaders())
        .send({
          ...validCreateBody,
          proyecto: { fechaEntregaEstimada: '2025' },
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.data.code).toBe('VALIDATION_ERROR');
    });

    it('responde 201 cuando fechaEntregaEstimada tiene formato válido AAAA-MM', async () => {
      const { app, properties } = setup(basePorts);

      const response = await request(app)
        .post(API_PATHS.properties)
        .set(authHeaders())
        .send({
          ...validCreateBody,
          proyecto: { fechaEntregaEstimada: '2025-12' },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(properties.create).toHaveBeenCalledTimes(1);
    });

    it('responde 422 cuando amenidad no está en el enum cerrado', async () => {
      const { app } = setup(basePorts);

      const response = await request(app)
        .post(API_PATHS.properties)
        .set(authHeaders())
        .send({
          ...validCreateBody,
          amenidades: ['PISCINA', 'SPA'],
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.data.code).toBe('VALIDATION_ERROR');
    });

    it('responde 201 cuando amenidades son válidas', async () => {
      const { app, properties } = setup(basePorts);

      const response = await request(app)
        .post(API_PATHS.properties)
        .set(authHeaders())
        .send({
          ...validCreateBody,
          amenidades: ['PISCINA', 'CANCHA', 'GIMNASIO'],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(properties.create).toHaveBeenCalledTimes(1);
    });

    it('responde 422 cuando puntosInteres.categoria no está en el enum cerrado', async () => {
      const { app } = setup(basePorts);

      const response = await request(app)
        .post(API_PATHS.properties)
        .set(authHeaders())
        .send({
          ...validCreateBody,
          puntosInteres: [{ categoria: 'PARQUE', etiqueta: { es: 'Parque' } }],
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.data.code).toBe('VALIDATION_ERROR');
    });

    it('responde 201 cuando puntosInteres.categoria es válida', async () => {
      const { app, properties } = setup(basePorts);

      const response = await request(app)
        .post(API_PATHS.properties)
        .set(authHeaders())
        .send({
          ...validCreateBody,
          puntosInteres: [
            { categoria: 'EDUCACION', etiqueta: { es: 'Colegio' } },
            { categoria: 'SALUD', etiqueta: { es: 'Hospital' } },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(properties.create).toHaveBeenCalledTimes(1);
    });

    it('responde 201 cuando puntosInteres no tiene categoría (personalizado)', async () => {
      const { app, properties } = setup(basePorts);

      const response = await request(app)
        .post(API_PATHS.properties)
        .set(authHeaders())
        .send({
          ...validCreateBody,
          puntosInteres: [{ etiqueta: { es: 'Mi lugar favorito' } }],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(properties.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/v1/properties — list preset validation', () => {
    it('responde 200 para preset 1 (solo base)', async () => {
      const { app, properties } = setup(basePorts);

      const response = await request(app)
        .get(API_PATHS.properties)
        .set(publicHeaders())
        .query({ operacion: 'VENTA', destacada: 'false' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(properties.listPublico).toHaveBeenCalledTimes(1);
    });

    it('responde 200 para preset 1+2 (base + rangoPrecio)', async () => {
      const { app, properties } = setup(basePorts);

      const response = await request(app).get(API_PATHS.properties).set(publicHeaders()).query({
        operacion: 'VENTA',
        destacada: 'false',
        precioMin: '100000000',
        precioMax: '200000000',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(properties.listPublico).toHaveBeenCalledTimes(1);
    });

    it('responde 200 para preset 1+3 (base + tipo)', async () => {
      const { app, properties } = setup(basePorts);

      const response = await request(app)
        .get(API_PATHS.properties)
        .set(publicHeaders())
        .query({ operacion: 'VENTA', destacada: 'false', tipo: 'CASA' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(properties.listPublico).toHaveBeenCalledTimes(1);
    });

    it('responde 200 para preset 1+4 (base + ubicacion)', async () => {
      const { app, properties } = setup(basePorts);

      const response = await request(app).get(API_PATHS.properties).set(publicHeaders()).query({
        operacion: 'VENTA',
        destacada: 'false',
        departamento: 'Antioquia',
        municipio: 'Medellín',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(properties.listPublico).toHaveBeenCalledTimes(1);
    });

    it('responde 200 para preset 1+2+3 (base + rangoPrecio + tipo)', async () => {
      const { app, properties } = setup(basePorts);

      const response = await request(app).get(API_PATHS.properties).set(publicHeaders()).query({
        operacion: 'VENTA',
        destacada: 'false',
        precioMin: '100000000',
        precioMax: '200000000',
        tipo: 'CASA',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(properties.listPublico).toHaveBeenCalledTimes(1);
    });

    it('responde 200 para preset 1+2+4 (base + rangoPrecio + ubicacion)', async () => {
      const { app, properties } = setup(basePorts);

      const response = await request(app).get(API_PATHS.properties).set(publicHeaders()).query({
        operacion: 'VENTA',
        destacada: 'false',
        precioMin: '100000000',
        precioMax: '200000000',
        departamento: 'Antioquia',
        municipio: 'Medellín',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(properties.listPublico).toHaveBeenCalledTimes(1);
    });

    it('responde 200 para preset 1+3+4 (base + tipo + ubicacion)', async () => {
      const { app, properties } = setup(basePorts);

      const response = await request(app).get(API_PATHS.properties).set(publicHeaders()).query({
        operacion: 'VENTA',
        destacada: 'false',
        tipo: 'CASA',
        departamento: 'Antioquia',
        municipio: 'Medellín',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(properties.listPublico).toHaveBeenCalledTimes(1);
    });

    it('responde 200 para preset 1+2+3+4 (base + rangoPrecio + tipo + ubicacion)', async () => {
      const { app, properties } = setup(basePorts);

      const response = await request(app).get(API_PATHS.properties).set(publicHeaders()).query({
        operacion: 'VENTA',
        destacada: 'false',
        precioMin: '100000000',
        precioMax: '200000000',
        tipo: 'CASA',
        departamento: 'Antioquia',
        municipio: 'Medellín',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(properties.listPublico).toHaveBeenCalledTimes(1);
    });

    it('responde 422 para combinación inválida: precioMin sin precioMax', async () => {
      const { app } = setup(basePorts);

      const response = await request(app)
        .get(API_PATHS.properties)
        .set(publicHeaders())
        .query({ operacion: 'VENTA', destacada: 'false', precioMin: '100000000' });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.data.code).toBe('VALIDATION_ERROR');
    });

    it('responde 422 para combinación inválida: precioMax sin precioMin', async () => {
      const { app } = setup(basePorts);

      const response = await request(app)
        .get(API_PATHS.properties)
        .set(publicHeaders())
        .query({ operacion: 'VENTA', destacada: 'false', precioMax: '200000000' });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.data.code).toBe('VALIDATION_ERROR');
    });

    it('responde 200 cuando cursor, limit e includeHidden se envían (excluidos de preset)', async () => {
      const { app, properties } = setup(basePorts);

      const response = await request(app).get(API_PATHS.properties).set(publicHeaders()).query({
        operacion: 'VENTA',
        destacada: 'false',
        tipo: 'CASA',
        cursor: 'abc123',
        limit: '10',
        includeHidden: 'false',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(properties.listPublico).toHaveBeenCalledWith(
        expect.objectContaining({
          operacion: 'VENTA',
          destacada: false,
          tipo: 'CASA',
          cursor: 'abc123',
          limit: 10,
          includeHidden: false,
        }),
      );
    });
  });
});
