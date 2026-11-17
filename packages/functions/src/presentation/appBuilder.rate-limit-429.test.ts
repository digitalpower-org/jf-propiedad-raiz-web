import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { RateLimitedError } from '../application/ports/rate-limiter';
import { INTERNAL_KEY, setup, verifiedIdentity } from './testing/appBuilderTestHarness';

const inputValido = {
  nombre: 'Juan Pérez',
  telefono: '+573001234567',
  email: 'cliente@ejemplo.com',
  tipo: 'CASA',
  departamento: 'Antioquia',
  municipio: 'Medellín',
  consent: true,
};

describe('Rate limit 429 (envelope D15)', () => {
  it('(a) consignaciones: permite 5 envíos y responde 429 en el 6.º', async () => {
    const { app, rateLimiter } = setup();
    let usados = 0;
    vi.mocked(rateLimiter.check).mockImplementation(
      async (_key: string, _limit: number, _windowSeconds: number): Promise<void> => {
        usados += 1;
        if (usados > 5) {
          throw new RateLimitedError('Límite de envíos excedido');
        }
      },
    );

    for (let i = 0; i < 5; i += 1) {
      const response = await request(app)
        .post('/api/v1/consignments')
        .set('X-Internal-Key', INTERNAL_KEY)
        .set('X-Client-IP', '203.0.113.10')
        .send(inputValido);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    }

    const response = await request(app)
      .post('/api/v1/consignments')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set('X-Client-IP', '203.0.113.10')
      .send(inputValido);

    expect(response.status).toBe(429);
    expect(response.body.success).toBe(false);
    expect(response.body.data).toEqual(
      expect.objectContaining({ code: 'RATE_LIMITED', requestId: expect.any(String) }),
    );
    expect(response.body.message).toBe('Límite de envíos excedido');
    expect(response.headers['x-request-id']).toBe(response.body.data.requestId);
  });

  it('(b) escritura admin: RateLimitedError → 429 con mensaje genérico y requestId', async () => {
    const { app, rateLimiter } = setup();
    vi.mocked(rateLimiter.check).mockRejectedValue(
      new RateLimitedError('Límite de solicitudes excedido'),
    );

    const response = await request(app)
      .post('/api/v1/properties')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set('X-User-Id', verifiedIdentity.uid)
      .set('X-User-Role', 'admin')
      .set('X-User-Email', verifiedIdentity.email)
      .send({});

    expect(response.status).toBe(429);
    expect(response.body.success).toBe(false);
    expect(response.body.data).toEqual(
      expect.objectContaining({ code: 'RATE_LIMITED', requestId: expect.any(String) }),
    );
    expect(response.body.message).toBe('Límite de solicitudes excedido');
    expect(response.headers['x-request-id']).toBe(response.body.data.requestId);
  });

  it('(c) lectura pública: RateLimitedError → 429 con mensaje genérico y requestId', async () => {
    const { app, rateLimiter } = setup();
    vi.mocked(rateLimiter.check).mockRejectedValue(
      new RateLimitedError('Límite de solicitudes excedido'),
    );

    const response = await request(app)
      .get('/api/v1/properties')
      .set('X-Internal-Key', INTERNAL_KEY)
      .send();

    expect(response.status).toBe(429);
    expect(response.body.success).toBe(false);
    expect(response.body.data).toEqual(
      expect.objectContaining({ code: 'RATE_LIMITED', requestId: expect.any(String) }),
    );
    expect(response.body.message).toBe('Límite de solicitudes excedido');
    expect(response.headers['x-request-id']).toBe(response.body.data.requestId);
  });
});
