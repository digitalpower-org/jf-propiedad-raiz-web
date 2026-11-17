import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { INTERNAL_KEY, setup } from './testing/appBuilderTestHarness';

describe('Orden de guards y no consumo de rate limiter en rechazos previos', () => {
  it('(g) X-Internal-Key inválido → 401 y rateLimiter.check no llamado', async () => {
    const { app, rateLimiter } = setup();
    const checkSpy = vi.mocked(rateLimiter.check);

    const response = await request(app)
      .post('/internal/auth/verify')
      .set('X-Internal-Key', 'wrong-key')
      .send({ idToken: 'firebase-token' });

    expect(response.status).toBe(401);
    expect(response.body.data.code).toBe('UNAUTHORIZED');
    expect(checkSpy).not.toHaveBeenCalled();
  });

  it('(h) consignación sin X-Client-IP → 422 y rateLimiter.check no llamado', async () => {
    const { app, rateLimiter } = setup();
    const checkSpy = vi.mocked(rateLimiter.check);

    const response = await request(app)
      .post('/api/v1/consignments')
      .set('X-Internal-Key', INTERNAL_KEY)
      .send({});

    expect(response.status).toBe(422);
    expect(response.body.data.code).toBe('VALIDATION_ERROR');
    expect(checkSpy).not.toHaveBeenCalled();
  });

  it('(i) escritura admin sin identidad → 401 y rateLimiter.check no llamado', async () => {
    const { app, rateLimiter } = setup();
    const checkSpy = vi.mocked(rateLimiter.check);

    const response = await request(app)
      .post('/api/v1/properties')
      .set('X-Internal-Key', INTERNAL_KEY)
      .send({});

    expect(response.status).toBe(401);
    expect(response.body.data.code).toBe('UNAUTHORIZED');
    expect(checkSpy).not.toHaveBeenCalled();
  });
});
