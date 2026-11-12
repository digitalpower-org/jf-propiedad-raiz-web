import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import type { ApplicationPorts } from '../application/ports';
import type { AuthorizedUsersRepository } from '../application/ports/authorized-users-repository';
import type { IdentityVerifier } from '../application/ports/identity-verifier';
import type { Logger } from '../application/ports/logger';
import type { RevalidationGateway } from '../application/ports/revalidation-gateway';
import type { Translator } from '../application/ports/translator';
import { buildUseCases } from '../application/buildUseCases';
import { createSecretComparator } from '../infrastructure/crypto/secret-comparator';
import { appBuilder } from './appBuilder';

const INTERNAL_KEY = 'k'.repeat(32);

function makePorts() {
  const logger: Logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const translator: Translator = { translate: vi.fn() };
  const revalidationGateway: RevalidationGateway = { revalidate: vi.fn() };
  const identityVerifier: IdentityVerifier = { verify: vi.fn() };
  const authorizedUsers: AuthorizedUsersRepository = { findActiveByEmail: vi.fn() };

  const ports: ApplicationPorts = {
    logger,
    translator,
    revalidationGateway,
    identityVerifier,
    authorizedUsers,
    secretComparator: createSecretComparator(),
    properties: {
      create: vi.fn(),
      findByIdOrSlug: vi.fn(),
      listPublico: vi.fn(),
      getFeatured: vi.fn(),
      update: vi.fn(),
      activate: vi.fn(),
      hide: vi.fn(),
      softDelete: vi.fn(),
    },
    services: {
      listar: vi.fn(),
    },
    about: {
      obtener: vi.fn(),
    },
    mediaStorage: {
      presignPut: vi.fn(),
      confirmarSubida: vi.fn(),
    },
    imageProcessor: {
      validarImagen: vi.fn(),
      generarDerivados: vi.fn(),
    },
    emailSender: { send: vi.fn() },
    rateLimiter: { check: vi.fn() },
  };
  return { ...ports, logger };
}

function setup() {
  const deps = makePorts();
  const app = appBuilder(buildUseCases(deps, { juanEmail: 'test@example.com' }), {
    internalKey: INTERNAL_KEY,
    logger: deps.logger,
    secretComparator: deps.secretComparator,
  });
  return { app, ...deps };
}

const verifiedIdentity = {
  uid: 'uid-1',
  email: 'admin@example.com',
  emailVerified: true,
};

describe('API HTTP', () => {
  it('GET /health responde con el cuerpo crudo esperado', async () => {
    const { app } = setup();

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', service: 'functions' });
  });

  it('POST /internal/auth/verify devuelve la identidad en el sobre estándar', async () => {
    const { app, identityVerifier, authorizedUsers } = setup();
    vi.mocked(identityVerifier.verify).mockResolvedValue(verifiedIdentity);
    vi.mocked(authorizedUsers.findActiveByEmail).mockResolvedValue({
      email: 'admin@example.com',
      role: 'admin',
    });

    const response = await request(app)
      .post('/internal/auth/verify')
      .set('X-Internal-Key', INTERNAL_KEY)
      .send({ idToken: 'firebase-token' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { uid: 'uid-1', email: 'admin@example.com', role: 'admin' },
      message: 'Identidad verificada',
    });
  });

  it('propaga el request id entrante en cabecera y errores', async () => {
    const { app, identityVerifier } = setup();
    vi.mocked(identityVerifier.verify).mockRejectedValue(new Error('invalid token'));

    const response = await request(app)
      .post('/internal/auth/verify')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set('X-Request-Id', 'req-123')
      .send({ idToken: 'firebase-token' });

    expect(response.status).toBe(401);
    expect(response.headers['x-request-id']).toBe('req-123');
    expect(response.body.data.requestId).toBe('req-123');
  });

  it('genera un request id cuando el entrante no es válido', async () => {
    const { app } = setup();

    const response = await request(app)
      .post('/internal/auth/verify')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set('X-Request-Id', 'invalid/request/id')
      .send({ idToken: 'firebase-token' });

    expect(response.headers['x-request-id']).not.toBe('invalid/request/id');
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rechaza una clave interna inválida con 401', async () => {
    const { app } = setup();

    const response = await request(app)
      .post('/internal/auth/verify')
      .set('X-Internal-Key', 'wrong-key')
      .send({ idToken: 'firebase-token' });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      data: { code: 'UNAUTHORIZED' },
      message: 'Clave interna inválida',
    });
  });

  it('rechaza un cuerpo sin idToken con VALIDATION_ERROR', async () => {
    const { app } = setup();

    const response = await request(app)
      .post('/internal/auth/verify')
      .set('X-Internal-Key', INTERNAL_KEY)
      .send({});

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      success: false,
      data: { code: 'VALIDATION_ERROR' },
      message: 'Datos inválidos',
    });
    expect(response.body.data.details[0].field).toBe('idToken');
  });

  it('rechaza JSON malformado con VALIDATION_ERROR', async () => {
    const { app } = setup();

    const response = await request(app)
      .post('/internal/auth/verify')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set('Content-Type', 'application/json')
      .send('{"idToken":');

    expect(response.status).toBe(422);
    expect(response.body.data.code).toBe('VALIDATION_ERROR');
  });

  it('traduce un token inválido a 401', async () => {
    const { app, identityVerifier } = setup();
    vi.mocked(identityVerifier.verify).mockRejectedValue(new Error('invalid token'));

    const response = await request(app)
      .post('/internal/auth/verify')
      .set('X-Internal-Key', INTERNAL_KEY)
      .send({ idToken: 'bad-token' });

    expect(response.status).toBe(401);
    expect(response.body.data.code).toBe('UNAUTHORIZED');
  });

  it('rechaza usuarios fuera de la lista blanca con 403', async () => {
    const { app, identityVerifier, authorizedUsers } = setup();
    vi.mocked(identityVerifier.verify).mockResolvedValue(verifiedIdentity);
    vi.mocked(authorizedUsers.findActiveByEmail).mockResolvedValue(null);

    const response = await request(app)
      .post('/internal/auth/verify')
      .set('X-Internal-Key', INTERNAL_KEY)
      .send({ idToken: 'firebase-token' });

    expect(response.status).toBe(403);
    expect(response.body.data.code).toBe('PERMISSION_DENIED');
  });

  it('devuelve 404 para rutas desconocidas', async () => {
    const { app } = setup();

    const response = await request(app).get('/unknown');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      data: { code: 'NOT_FOUND' },
    });
  });

  it('devuelve 405 para métodos no permitidos en rutas conocidas', async () => {
    const { app } = setup();

    const response = await request(app).get('/internal/auth/verify');

    expect(response.status).toBe(405);
    expect(response.body).toMatchObject({
      success: false,
      data: { code: 'METHOD_NOT_ALLOWED' },
    });
  });

  it('devuelve 500 y registra errores no controlados', async () => {
    const { app, identityVerifier, authorizedUsers, logger } = setup();
    vi.mocked(identityVerifier.verify).mockResolvedValue(verifiedIdentity);
    vi.mocked(authorizedUsers.findActiveByEmail).mockRejectedValue(new Error('firestore down'));

    const response = await request(app)
      .post('/internal/auth/verify')
      .set('X-Internal-Key', INTERNAL_KEY)
      .send({ idToken: 'firebase-token' });

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      success: false,
      data: { code: 'INTERNAL' },
      message: 'Error interno',
    });
    expect(logger.error).toHaveBeenCalledWith(
      'unhandled_error',
      expect.any(Error),
      expect.objectContaining({ requestId: expect.any(String) }),
    );
  });
});
