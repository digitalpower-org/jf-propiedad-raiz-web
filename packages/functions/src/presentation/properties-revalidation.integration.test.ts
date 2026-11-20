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

const validUpdateBody = {
  titulo: { es: 'Casa en venta actualizada' },
  precio: 160000000,
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
    listPublico: vi.fn(),
    getFeatured: vi.fn(),
    update: vi.fn().mockResolvedValue({
      property: {
        ...validPropertyDto,
        ...validUpdateBody,
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

describe('Properties revalidation integration (MT1.4)', () => {
  let basePorts: ReturnType<typeof makeBasePorts>;

  beforeEach(() => {
    vi.resetAllMocks();
    basePorts = makeBasePorts();
  });

  describe('POST /api/v1/properties — create', () => {
    it('responde 201 y llama a revalidate con "propiedades" tras crear', async () => {
      const { app, revalidationGateway, properties } = setup(basePorts);

      const response = await request(app)
        .post(API_PATHS.properties)
        .set(authHeaders())
        .send(validCreateBody);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(properties.create).toHaveBeenCalledTimes(1);
      expect(revalidationGateway.revalidate).toHaveBeenCalledTimes(1);
      expect(revalidationGateway.revalidate).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.arrayContaining(['propiedades']),
        }),
      );
    });
  });

  describe('PUT /api/v1/properties/:idOrSlug — update', () => {
    it('responde 200 y llama a revalidate con "propiedades" tras actualizar', async () => {
      const { app, revalidationGateway, properties } = setup(basePorts);

      const response = await request(app)
        .put(API_PATHS.property.replace(':idOrSlug', 'prop-123'))
        .set(authHeaders())
        .send(validUpdateBody);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(properties.update).toHaveBeenCalledTimes(1);
      expect(revalidationGateway.revalidate).toHaveBeenCalledTimes(1);
      expect(revalidationGateway.revalidate).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.arrayContaining(['propiedades']),
        }),
      );
    });
  });

  describe('POST /api/v1/properties/:idOrSlug/activate — activate', () => {
    it('responde 200 y llama a revalidate con "propiedades" tras activar', async () => {
      const { app, revalidationGateway, properties } = setup(basePorts);

      const response = await request(app)
        .post(API_PATHS.activateProperty.replace(':idOrSlug', 'prop-123'))
        .set(authHeaders())
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(properties.activate).toHaveBeenCalledTimes(1);
      expect(revalidationGateway.revalidate).toHaveBeenCalledTimes(1);
      expect(revalidationGateway.revalidate).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.arrayContaining(['propiedades']),
        }),
      );
    });
  });

  describe('POST /api/v1/properties/:idOrSlug/hide — hide', () => {
    it('responde 200 y llama a revalidate con "propiedades" tras ocultar', async () => {
      const { app, revalidationGateway, properties } = setup(basePorts);

      const response = await request(app)
        .post(API_PATHS.hideProperty.replace(':idOrSlug', 'prop-123'))
        .set(authHeaders())
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(properties.hide).toHaveBeenCalledTimes(1);
      expect(revalidationGateway.revalidate).toHaveBeenCalledTimes(1);
      expect(revalidationGateway.revalidate).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.arrayContaining(['propiedades']),
        }),
      );
    });
  });

  describe('DELETE /api/v1/properties/:idOrSlug — delete', () => {
    it('responde 200 y llama a revalidate con "propiedades" tras soft delete', async () => {
      const { app, revalidationGateway, properties } = setup(basePorts);

      const response = await request(app)
        .delete(API_PATHS.property.replace(':idOrSlug', 'prop-123'))
        .set(authHeaders());

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(properties.softDelete).toHaveBeenCalledTimes(1);
      expect(revalidationGateway.revalidate).toHaveBeenCalledTimes(1);
      expect(revalidationGateway.revalidate).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.arrayContaining(['propiedades']),
        }),
      );
    });
  });

  describe('Revalidation failure — mutation still executes (no rollback)', () => {
    it('POST create: revalidate falla pero la creación persiste y se captura la respuesta HTTP', async () => {
      const failingGateway = makeRevalidationGateway({
        revalidate: vi.fn().mockResolvedValue({ ok: false }),
      });
      const ports = makePorts({
        revalidationGateway: failingGateway,
        rateLimiter: makeRateLimiter(),
        properties: makePropertiesRepository(),
        identityVerifier: makeIdentityVerifier(),
        authorizedUsers: makeAuthorizedUsers(),
      });
      const { app, revalidationGateway, properties } = setup(ports);

      const response = await request(app)
        .post(API_PATHS.properties)
        .set(authHeaders('req-fail-create'))
        .send(validCreateBody);

      // La mutación se ejecutó (no hay rollback)
      expect(properties.create).toHaveBeenCalledTimes(1);
      // La revalidación se intentó
      expect(revalidationGateway.revalidate).toHaveBeenCalledTimes(1);
      // La respuesta HTTP es exitosa (201) porque la escritura tuvo éxito
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('PUT update: revalidate falla pero la actualización persiste', async () => {
      const failingGateway = makeRevalidationGateway({
        revalidate: vi.fn().mockResolvedValue({ ok: false }),
      });
      const ports = makePorts({
        revalidationGateway: failingGateway,
        rateLimiter: makeRateLimiter(),
        properties: makePropertiesRepository(),
        identityVerifier: makeIdentityVerifier(),
        authorizedUsers: makeAuthorizedUsers(),
      });
      const { app, revalidationGateway, properties } = setup(ports);

      const response = await request(app)
        .put(API_PATHS.property.replace(':idOrSlug', 'prop-123'))
        .set(authHeaders('req-fail-update'))
        .send(validUpdateBody);

      expect(properties.update).toHaveBeenCalledTimes(1);
      expect(revalidationGateway.revalidate).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('POST activate: revalidate falla pero la activación persiste', async () => {
      const failingGateway = makeRevalidationGateway({
        revalidate: vi.fn().mockResolvedValue({ ok: false }),
      });
      const ports = makePorts({
        revalidationGateway: failingGateway,
        rateLimiter: makeRateLimiter(),
        properties: makePropertiesRepository(),
        identityVerifier: makeIdentityVerifier(),
        authorizedUsers: makeAuthorizedUsers(),
      });
      const { app, revalidationGateway, properties } = setup(ports);

      const response = await request(app)
        .post(API_PATHS.activateProperty.replace(':idOrSlug', 'prop-123'))
        .set(authHeaders('req-fail-activate'))
        .send({});

      expect(properties.activate).toHaveBeenCalledTimes(1);
      expect(revalidationGateway.revalidate).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('POST hide: revalidate falla pero el ocultamiento persiste', async () => {
      const failingGateway = makeRevalidationGateway({
        revalidate: vi.fn().mockResolvedValue({ ok: false }),
      });
      const ports = makePorts({
        revalidationGateway: failingGateway,
        rateLimiter: makeRateLimiter(),
        properties: makePropertiesRepository(),
        identityVerifier: makeIdentityVerifier(),
        authorizedUsers: makeAuthorizedUsers(),
      });
      const { app, revalidationGateway, properties } = setup(ports);

      const response = await request(app)
        .post(API_PATHS.hideProperty.replace(':idOrSlug', 'prop-123'))
        .set(authHeaders('req-fail-hide'))
        .send({});

      expect(properties.hide).toHaveBeenCalledTimes(1);
      expect(revalidationGateway.revalidate).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('DELETE: revalidate falla pero el soft delete persiste', async () => {
      const failingGateway = makeRevalidationGateway({
        revalidate: vi.fn().mockResolvedValue({ ok: false }),
      });
      const ports = makePorts({
        revalidationGateway: failingGateway,
        rateLimiter: makeRateLimiter(),
        properties: makePropertiesRepository(),
        identityVerifier: makeIdentityVerifier(),
        authorizedUsers: makeAuthorizedUsers(),
      });
      const { app, revalidationGateway, properties } = setup(ports);

      const response = await request(app)
        .delete(API_PATHS.property.replace(':idOrSlug', 'prop-123'))
        .set(authHeaders('req-fail-delete'));

      expect(properties.softDelete).toHaveBeenCalledTimes(1);
      expect(revalidationGateway.revalidate).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
