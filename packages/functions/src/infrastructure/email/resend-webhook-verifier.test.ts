import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ResendWebhookVerifier } from './resend-webhook-verifier';

const mocks = vi.hoisted(() => ({
  webhooksVerify: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: class {
    constructor(_apiKey: string) {
      this.webhooks = { verify: mocks.webhooksVerify };
    }
    webhooks: { verify: typeof mocks.webhooksVerify };
  },
}));

describe('ResendWebhookVerifier', () => {
  const apiKey = 'test-api-key';
  const webhookSecret = 'test-webhook-secret';
  const rawBody = JSON.stringify({
    type: 'email.delivered',
    created_at: '2026-11-24T12:00:00Z',
    data: { tags: { consignmentRequestId: 'req-123', consignmentKind: 'admin' } },
  });
  const headers = {
    'svix-id': 'evt-456',
    'svix-timestamp': '1732444800',
    'svix-signature': 'test-signature',
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve el evento validado con los campos mínimos cuando la firma es válida', async () => {
    const verifier = new ResendWebhookVerifier(apiKey, webhookSecret);
    mocks.webhooksVerify.mockReturnValue({
      type: 'email.delivered',
      created_at: '2026-11-24T12:00:00Z',
      data: { tags: { consignmentRequestId: 'req-123', consignmentKind: 'admin' } },
    });

    const result = await verifier.verify({ rawBody, headers });

    expect(result).toEqual({
      eventId: 'evt-456',
      eventType: 'email.delivered',
      createdAt: '2026-11-24T12:00:00Z',
      tags: { consignmentRequestId: 'req-123', consignmentKind: 'admin' },
    });
    expect(mocks.webhooksVerify).toHaveBeenCalledWith({
      payload: rawBody,
      headers: {
        id: 'evt-456',
        timestamp: '1732444800',
        signature: 'test-signature',
      },
      webhookSecret,
    });
  });

  it('devuelve tags vacíos cuando el evento no tiene tags', async () => {
    const verifier = new ResendWebhookVerifier(apiKey, webhookSecret);
    mocks.webhooksVerify.mockReturnValue({
      type: 'email.delivered',
      created_at: '2026-11-24T12:00:00Z',
      data: {},
    });

    const result = await verifier.verify({ rawBody, headers });

    expect(result.tags).toEqual({});
  });

  it('lanza cuando el SDK de Resend rechaza la firma', async () => {
    const verifier = new ResendWebhookVerifier(apiKey, webhookSecret);
    mocks.webhooksVerify.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    await expect(verifier.verify({ rawBody, headers })).rejects.toThrow('Invalid signature');
  });

  it('acepta body como Buffer', async () => {
    const verifier = new ResendWebhookVerifier(apiKey, webhookSecret);
    mocks.webhooksVerify.mockReturnValue({
      type: 'email.delivered',
      created_at: '2026-11-24T12:00:00Z',
      data: { tags: {} },
    });

    await verifier.verify({ rawBody: Buffer.from(rawBody), headers });

    expect(mocks.webhooksVerify).toHaveBeenCalledWith(
      expect.objectContaining({ payload: rawBody }),
    );
  });
});
