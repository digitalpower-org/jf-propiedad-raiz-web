import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { INTERNAL_KEY, setup, verifiedIdentity } from './testing/appBuilderTestHarness';

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
