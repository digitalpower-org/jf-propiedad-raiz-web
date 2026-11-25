import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ResendEmailSender } from './resend-email-sender';

const mocks = vi.hoisted(() => ({
  emailsSend: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: class {
    constructor(_apiKey: string) {
      this.emails = { send: mocks.emailsSend };
    }
    emails: Record<string, unknown>;
  },
  emails: { send: mocks.emailsSend },
}));

describe('ResendEmailSender', () => {
  const fromEmail = 'test@example.com';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('resuelve cuando el SDK de Resend devuelve éxito', async () => {
    const sender = new ResendEmailSender('test-api-key', fromEmail);
    const mockResponse = {
      data: { id: 'email-123' },
      error: null,
    };
    mocks.emailsSend.mockResolvedValue(mockResponse);

    await expect(
      sender.send('recipient@example.com', 'Test Subject', '<p>Test HTML</p>'),
    ).resolves.toBeUndefined();

    expect(mocks.emailsSend).toHaveBeenCalledWith({
      from: `Consignaciones <${fromEmail}>`,
      to: 'recipient@example.com',
      subject: 'Test Subject',
      html: '<p>Test HTML</p>',
    });
  });

  it('lanza cuando el SDK de Resend devuelve error', async () => {
    const sender = new ResendEmailSender('test-api-key', fromEmail);
    const mockError = {
      data: null,
      error: {
        message: 'Invalid API key',
        name: 'ValidationError',
        statusCode: 401,
      },
    };
    mocks.emailsSend.mockResolvedValue(mockError);

    await expect(
      sender.send('recipient@example.com', 'Test Subject', '<p>Test HTML</p>'),
    ).rejects.toThrow('Resend error: Invalid API key');

    expect(mocks.emailsSend).toHaveBeenCalledWith({
      from: `Consignaciones <${fromEmail}>`,
      to: 'recipient@example.com',
      subject: 'Test Subject',
      html: '<p>Test HTML</p>',
    });
  });

  it('reenvía replyTo al SDK de Resend cuando se proporciona', async () => {
    const sender = new ResendEmailSender('test-api-key', fromEmail);
    mocks.emailsSend.mockResolvedValue({ data: { id: 'email-123' }, error: null });

    await sender.send(
      'recipient@example.com',
      'Test Subject',
      '<p>Test HTML</p>',
      'reply@example.com',
    );

    expect(mocks.emailsSend).toHaveBeenCalledWith({
      from: `Consignaciones <${fromEmail}>`,
      to: 'recipient@example.com',
      subject: 'Test Subject',
      html: '<p>Test HTML</p>',
      replyTo: 'reply@example.com',
    });
  });
});
