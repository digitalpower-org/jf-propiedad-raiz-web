import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { INTERNAL_KEY, setup } from './testing/appBuilderTestHarness';

describe('Rate limit — modos de fallo (fail-close / fail-open)', () => {
  it('(d) fallo de infra en escritura admin → 429 D15 y logger.error', async () => {
    const { app, rateLimiter, logger } = setup();
    vi.mocked(rateLimiter.check).mockRejectedValue(new Error('firestore down'));
    const errorSpy = vi.mocked(logger.error);
    const warnSpy = vi.mocked(logger.warn);

    const response = await request(app)
      .post('/api/v1/properties')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set('X-User-Id', 'uid-1')
      .set('X-User-Role', 'admin')
      .set('X-User-Email', 'admin@example.com')
      .send({});

    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({
      success: false,
      data: { code: 'RATE_LIMITED', requestId: expect.any(String) },
      message: 'Límite de solicitudes excedido',
    });
    expect(errorSpy).toHaveBeenCalledWith(
      'rate_limiter_unavailable',
      expect.any(Error),
      expect.objectContaining({
        guard: 'rate-admin-write',
        requestId: expect.any(String),
      }),
    );
    const errorCalls = errorSpy.mock.calls.filter(([msg]) => msg === 'rate_limiter_unavailable');
    expect(errorCalls).toHaveLength(1);
    const [, , meta] = errorCalls[0];
    expect(meta).not.toHaveProperty('ip');
    expect(meta).not.toHaveProperty('uid');
    expect(meta).not.toHaveProperty('key');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('(e) fallo de infra en lectura pública → 429 y logger.error', async () => {
    const { app, rateLimiter, logger } = setup();
    vi.mocked(rateLimiter.check).mockRejectedValue(new Error('firestore down'));
    const errorSpy = vi.mocked(logger.error);
    const warnSpy = vi.mocked(logger.warn);

    const response = await request(app)
      .get('/api/v1/properties/featured')
      .set('X-Internal-Key', INTERNAL_KEY);

    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({
      success: false,
      data: { code: 'RATE_LIMITED', requestId: expect.any(String) },
      message: 'Límite de solicitudes excedido',
    });
    expect(errorSpy).toHaveBeenCalledWith(
      'rate_limiter_unavailable',
      expect.any(Error),
      expect.objectContaining({
        guard: 'rate-public-read',
        requestId: expect.any(String),
      }),
    );
    const errorCalls = errorSpy.mock.calls.filter(([msg]) => msg === 'rate_limiter_unavailable');
    expect(errorCalls).toHaveLength(1);
    const [, , meta] = errorCalls[0];
    expect(meta).not.toHaveProperty('ip');
    expect(meta).not.toHaveProperty('uid');
    expect(meta).not.toHaveProperty('key');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('(f) fallo de infra en /health → 200 y logger.warn, sin logger.error', async () => {
    const { app, rateLimiter, logger } = setup();
    vi.mocked(rateLimiter.check).mockRejectedValue(new Error('firestore down'));
    const warnSpy = vi.mocked(logger.warn);
    const errorSpy = vi.mocked(logger.error);

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', service: 'functions' });
    expect(warnSpy).toHaveBeenCalledWith(
      'rate_limiter_unavailable',
      expect.objectContaining({
        guard: 'rate-health',
        requestId: expect.any(String),
      }),
    );
    const warnCalls = warnSpy.mock.calls.filter(([msg]) => msg === 'rate_limiter_unavailable');
    expect(warnCalls).toHaveLength(1);
    const [, warnMeta] = warnCalls[0];
    expect(warnMeta).not.toHaveProperty('ip');
    expect(warnMeta).not.toHaveProperty('uid');
    expect(warnMeta).not.toHaveProperty('key');
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
