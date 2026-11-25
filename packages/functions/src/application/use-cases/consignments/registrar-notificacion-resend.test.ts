import { describe, expect, it, vi } from 'vitest';

import { RegistrarNotificacionResendUseCase } from './registrar-notificacion-resend';
import type { ConsignmentEmailNotificationRepository } from '../../ports/consignment-email-notification-repository';
import type { Logger } from '../../ports/logger';
import {
  CONSIGNMENT_KIND_TAG,
  CONSIGNMENT_REQUEST_ID_TAG,
} from '../../consignments/resend-notification';

function makeSut(
  overrides: {
    repository?: Partial<ConsignmentEmailNotificationRepository>;
    logger?: Partial<Logger>;
    ttlSeconds?: number;
  } = {},
) {
  const repository: ConsignmentEmailNotificationRepository = {
    appendIfAbsent: vi.fn().mockResolvedValue(undefined),
    listByRequestId: vi.fn().mockResolvedValue([]),
    ...overrides.repository,
  };
  const logger: Logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    ...overrides.logger,
  };

  return {
    sut: new RegistrarNotificacionResendUseCase(repository, logger, overrides.ttlSeconds ?? 3600),
    repository,
    logger,
  };
}

const tagsAdmin = {
  [CONSIGNMENT_REQUEST_ID_TAG]: 'req-123',
  [CONSIGNMENT_KIND_TAG]: 'admin',
};
const tagsClient = {
  [CONSIGNMENT_REQUEST_ID_TAG]: 'req-123',
  [CONSIGNMENT_KIND_TAG]: 'client',
};
const tagsUntagged: Record<string, string> = {};

describe('RegistrarNotificacionResendUseCase', () => {
  it('persiste la notificación cuando el tag es admin con consignmentRequestId válido', async () => {
    const { sut, repository } = makeSut();

    const resultado = await sut.execute({
      eventId: 'evt-456',
      eventType: 'email.delivered',
      createdAt: '2026-11-24T12:00:00Z',
      tags: tagsAdmin,
    });

    expect(resultado.persistida).toBe(true);
    expect(vi.mocked(repository.appendIfAbsent)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(repository.appendIfAbsent)).toHaveBeenCalledWith({
      svixId: 'evt-456',
      requestId: 'req-123',
      notification: {
        eventId: 'evt-456',
        eventType: 'email.delivered',
        createdAt: '2026-11-24T12:00:00Z',
        receivedAt: expect.any(String),
      },
      expiresAt: '2026-11-24T13:00:00.000Z',
    });
  });

  it('no persiste y retorna persistida=false cuando el tag es client', async () => {
    const { sut, repository, logger } = makeSut();

    const resultado = await sut.execute({
      eventId: 'evt-456',
      eventType: 'email.delivered',
      createdAt: '2026-11-24T12:00:00Z',
      tags: tagsClient,
    });

    expect(resultado.persistida).toBe(false);
    expect(repository.appendIfAbsent).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith('webhook_notificacion_no_admin_ignorada');
  });

  it('no persiste cuando el tag es admin pero falta consignmentRequestId', async () => {
    const { sut, repository } = makeSut();

    const resultado = await sut.execute({
      eventId: 'evt-456',
      eventType: 'email.delivered',
      createdAt: '2026-11-24T12:00:00Z',
      tags: { [CONSIGNMENT_KIND_TAG]: 'admin' },
    });

    expect(resultado.persistida).toBe(false);
    expect(repository.appendIfAbsent).not.toHaveBeenCalled();
  });

  it('no persiste cuando no hay tags', async () => {
    const { sut, repository } = makeSut();

    const resultado = await sut.execute({
      eventId: 'evt-456',
      eventType: 'email.delivered',
      createdAt: '2026-11-24T12:00:00Z',
      tags: tagsUntagged,
    });

    expect(resultado.persistida).toBe(false);
    expect(repository.appendIfAbsent).not.toHaveBeenCalled();
  });

  it('calcula expiresAt como createdAt + TTL', async () => {
    const { sut, repository } = makeSut({ ttlSeconds: 86400 });

    await sut.execute({
      eventId: 'evt-456',
      eventType: 'email.delivered',
      createdAt: '2026-11-24T12:00:00Z',
      tags: tagsAdmin,
    });

    expect(vi.mocked(repository.appendIfAbsent)).toHaveBeenCalledWith(
      expect.objectContaining({ expiresAt: '2026-11-25T12:00:00.000Z' }),
    );
  });

  it('usa el TTL proporcionado al construir el caso de uso', async () => {
    const { sut, repository } = makeSut({ ttlSeconds: 3600 });

    await sut.execute({
      eventId: 'evt-456',
      eventType: 'email.delivered',
      createdAt: '2026-11-24T12:00:00Z',
      tags: tagsAdmin,
    });

    expect(vi.mocked(repository.appendIfAbsent)).toHaveBeenCalledWith(
      expect.objectContaining({ expiresAt: '2026-11-24T13:00:00.000Z' }),
    );
  });
});
