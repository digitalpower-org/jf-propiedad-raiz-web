import { describe, expect, it, vi } from 'vitest';

import { ObtenerNotificacionesResendUseCase } from './obtener-notificaciones-resend';
import type { ConsignmentEmailNotificationRepository } from '../../ports/consignment-email-notification-repository';
import type { Logger } from '../../ports/logger';
import type { ResendNotification } from '../../consignments/resend-notification';

function notificacion(overrides: Partial<ResendNotification> = {}): ResendNotification {
  return {
    eventId: 'evt-456',
    eventType: 'email.delivered',
    createdAt: '2026-11-24T12:00:00.000Z',
    receivedAt: '2026-11-24T12:00:05.000Z',
    ...overrides,
  };
}

function makeSut(
  overrides: {
    repository?: Partial<ConsignmentEmailNotificationRepository>;
    logger?: Partial<Logger>;
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
    sut: new ObtenerNotificacionesResendUseCase(repository, logger),
    repository,
    logger,
  };
}

describe('ObtenerNotificacionesResendUseCase', () => {
  it('devuelve las notificaciones vigentes del repositorio para el requestId', async () => {
    const { sut, repository } = makeSut({
      repository: {
        listByRequestId: vi
          .fn()
          .mockResolvedValue([notificacion(), notificacion({ eventId: 'evt-789' })]),
      },
    });

    const resultado = await sut.execute({ requestId: 'req-123' });

    expect(resultado).toEqual({
      requestId: 'req-123',
      notifications: [
        {
          eventId: 'evt-456',
          eventType: 'email.delivered',
          createdAt: '2026-11-24T12:00:00.000Z',
          receivedAt: '2026-11-24T12:00:05.000Z',
        },
        {
          eventId: 'evt-789',
          eventType: 'email.delivered',
          createdAt: '2026-11-24T12:00:00.000Z',
          receivedAt: '2026-11-24T12:00:05.000Z',
        },
      ],
    });
    expect(vi.mocked(repository.listByRequestId)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(repository.listByRequestId)).toHaveBeenCalledWith('req-123');
  });

  it('devuelve notifications vacía cuando el repositorio no tiene notificaciones', async () => {
    const { sut } = makeSut();

    const resultado = await sut.execute({ requestId: 'req-inexistente' });

    expect(resultado).toEqual({ requestId: 'req-inexistente', notifications: [] });
  });

  it('no registra PII en logs (solo requestId y conteo)', async () => {
    const { sut, logger } = makeSut({
      repository: {
        listByRequestId: vi.fn().mockResolvedValue([notificacion()]),
      },
    });

    await sut.execute({ requestId: 'req-123' });

    expect(logger.debug).toHaveBeenCalledWith('consulta_notificaciones_resend', {
      requestId: 'req-123',
      total: 1,
    });
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
