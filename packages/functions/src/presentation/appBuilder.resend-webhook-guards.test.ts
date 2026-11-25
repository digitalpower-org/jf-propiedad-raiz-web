import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { RateLimitedError } from '../application/ports/rate-limiter';
import { API_PATHS } from './paths';
import { setup } from './testing/appBuilderTestHarness';

const headersSvixValidos = {
  'svix-id': 'msg-123',
  'svix-timestamp': '1732444800',
  'svix-signature': 'v1,signature-dummy',
};

describe('Resend delivery webhook guards (Svix + rate limit)', () => {
  it('(a) faltan cabeceras Svix → 422 y rateLimiter.check no llamado', async () => {
    const { app, rateLimiter } = setup();
    const checkSpy = vi.mocked(rateLimiter.check);

    const response = await request(app).post(API_PATHS.resendDeliveryWebhook).send({});

    expect(response.status).toBe(422);
    expect(response.body.data.code).toBe('VALIDATION_ERROR');
    expect(checkSpy).not.toHaveBeenCalled();
  });

  it('(b) RateLimitedError → 429 con envelope D15, límite 600 y ventana 60', async () => {
    const { app, rateLimiter } = setup();
    const checkSpy = vi.mocked(rateLimiter.check);
    checkSpy.mockRejectedValue(new RateLimitedError('Límite de solicitudes excedido'));

    const response = await request(app)
      .post(API_PATHS.resendDeliveryWebhook)
      .set('svix-id', headersSvixValidos['svix-id'])
      .set('svix-timestamp', headersSvixValidos['svix-timestamp'])
      .set('svix-signature', headersSvixValidos['svix-signature'])
      .send({});

    expect(response.status).toBe(429);
    expect(response.body.success).toBe(false);
    expect(response.body.data).toEqual(
      expect.objectContaining({ code: 'RATE_LIMITED', requestId: expect.any(String) }),
    );
    expect(response.body.message).toBe('Límite de solicitudes excedido');
    expect(response.headers['x-request-id']).toBe(response.body.data.requestId);
    expect(checkSpy).toHaveBeenCalledWith(expect.any(String), 600, 60);
  });

  it('(c) verifier rechaza firma → 401 UNAUTHORIZED, límite 600 y ventana 60', async () => {
    const { app, rateLimiter, deliveryWebhookVerifier } = setup({
      deliveryWebhookVerifier: {
        verify: vi.fn().mockRejectedValue(new Error('Firma de webhook inválida')),
      },
    });
    const checkSpy = vi.mocked(rateLimiter.check);
    const verifySpy = vi.mocked(deliveryWebhookVerifier.verify);

    const response = await request(app)
      .post(API_PATHS.resendDeliveryWebhook)
      .set('svix-id', headersSvixValidos['svix-id'])
      .set('svix-timestamp', headersSvixValidos['svix-timestamp'])
      .set('svix-signature', headersSvixValidos['svix-signature'])
      .send({});

    expect(response.status).toBe(401);
    expect(response.body.data.code).toBe('UNAUTHORIZED');
    expect(verifySpy).toHaveBeenCalledTimes(1);
    expect(checkSpy).toHaveBeenCalledWith(expect.any(String), 600, 60);
  });
});
