// US3.1 — Tests de integración del handler POST /api/v1/consignments.

import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import type { ApplicationPorts } from '../../../application/ports';
import type { Logger } from '../../../application/ports/logger';
import { RateLimitedError } from '../../../application/ports/rate-limiter';
import { buildUseCases } from '../../../application/buildUseCases';
import { createSecretComparator } from '../../../infrastructure/crypto/secret-comparator';
import { appBuilder } from '../../appBuilder';

const INTERNAL_KEY = 'k'.repeat(32);

const inputValido = {
  nombre: 'Juan Pérez',
  telefono: '+573001234567',
  email: 'cliente@ejemplo.com',
  tipo: 'CASA',
  departamento: 'Antioquia',
  municipio: 'Medellín',
  consent: true,
};

function makePorts(overrides: Partial<ApplicationPorts> = {}): ApplicationPorts {
  const logger: Logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  return {
    logger,
    translator: { translate: vi.fn() },
    revalidationGateway: { revalidate: vi.fn() },
    identityVerifier: { verify: vi.fn() },
    authorizedUsers: { findActiveByEmail: vi.fn() },
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
    services: { listar: vi.fn() },
    about: { obtener: vi.fn() },
    mediaStorage: { presignPut: vi.fn(), confirmarSubida: vi.fn() },
    imageProcessor: { validarImagen: vi.fn(), generarDerivados: vi.fn() },
    emailSender: { send: vi.fn().mockResolvedValue(undefined) },
    rateLimiter: { check: vi.fn().mockResolvedValue(undefined) },
    ...overrides,
  };
}

function setup(overrides: Partial<ApplicationPorts> = {}) {
  const ports = makePorts(overrides);
  const app = appBuilder(buildUseCases(ports, { juanEmail: 'test@example.com' }), {
    internalKey: INTERNAL_KEY,
    logger: ports.logger,
    secretComparator: ports.secretComparator,
  });
  return { app, ports };
}

describe('POST /api/v1/consignments', () => {
  it('rechaza sin clave interna con 401', async () => {
    const { app } = setup();

    const response = await request(app).post('/api/v1/consignments').send(inputValido);

    expect(response.status).toBe(401);
    expect(response.body.data.code).toBe('UNAUTHORIZED');
  });

  it('rechaza sin X-Client-IP con 500 (cabecera requerida para rate limit)', async () => {
    const { app } = setup();

    const response = await request(app)
      .post('/api/v1/consignments')
      .set('X-Internal-Key', INTERNAL_KEY)
      .send(inputValido);

    expect(response.status).toBe(500);
  });

  it('rechaza con 422 cuando consent falta (CONSENT_REQUIRED)', async () => {
    const { app } = setup();
    const { consent: _consent, ...sinConsent } = inputValido;

    const response = await request(app)
      .post('/api/v1/consignments')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set('X-Client-IP', '1.2.3.4')
      .send(sinConsent);

    expect(response.status).toBe(422);
    expect(response.body.data.code).toBe('CONSENT_REQUIRED');
  });

  it('rechaza con 429 cuando el rate limiter indica límite excedido', async () => {
    const rateLimiter = { check: vi.fn().mockRejectedValue(new RateLimitedError('rate limited')) };
    const { app } = setup({ rateLimiter });

    const response = await request(app)
      .post('/api/v1/consignments')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set('X-Client-IP', '1.2.3.4')
      .send(inputValido);

    expect(response.status).toBe(429);
    expect(response.body.data.code).toBe('RATE_LIMITED');
  });

  it('retorna 200 y enviado=true cuando la solicitud es válida', async () => {
    const emailSender = { send: vi.fn().mockResolvedValue(undefined) };
    const { app } = setup({ emailSender });

    const response = await request(app)
      .post('/api/v1/consignments')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set('X-Client-IP', '1.2.3.4')
      .send(inputValido);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.enviado).toBe(true);
    expect(vi.mocked(emailSender.send)).toHaveBeenCalledTimes(2);
  });

  it('retorna enviado=false y no envía correos cuando el honeypot `sitio` tiene valor', async () => {
    const emailSender = { send: vi.fn().mockResolvedValue(undefined) };
    const { app } = setup({ emailSender });

    const response = await request(app)
      .post('/api/v1/consignments')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set('X-Client-IP', '1.2.3.4')
      .send({ ...inputValido, sitio: 'bot-value' });

    expect(response.status).toBe(200);
    expect(response.body.data.enviado).toBe(false);
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it('rechaza con 422 cuando el cuerpo tiene campos inválidos', async () => {
    const { app } = setup();

    const response = await request(app)
      .post('/api/v1/consignments')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set('X-Client-IP', '1.2.3.4')
      .send({ ...inputValido, email: 'no-es-un-email' });

    expect(response.status).toBe(422);
    expect(response.body.data.code).toBe('VALIDATION_ERROR');
  });

  it('rechaza con 405 para método GET', async () => {
    const { app } = setup();

    const response = await request(app)
      .get('/api/v1/consignments')
      .set('X-Internal-Key', INTERNAL_KEY);

    expect(response.status).toBe(405);
    expect(response.body.data.code).toBe('METHOD_NOT_ALLOWED');
  });
});
