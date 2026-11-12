// US3.1 / US3.4 — Tests unitarios de CrearConsignmentUseCase.

import { describe, expect, it, vi } from 'vitest';

import type { BackendSpec } from '@jf/shared-types';
import { CrearConsignmentUseCase } from './crear-consignment';
import type { EmailSender } from '../../ports/email-sender';
import type { Logger } from '../../ports/logger';

type ConsignmentInput = BackendSpec.components['schemas']['ConsignmentInput'];

const inputBase: ConsignmentInput = {
  nombre: 'Juan Pérez',
  telefono: '+573001234567',
  email: 'cliente@ejemplo.com',
  tipo: 'CASA',
  departamento: 'Antioquia',
  municipio: 'Medellín',
  consent: true,
};

function makeSut(
  overrides: {
    emailSender?: Partial<EmailSender>;
    logger?: Partial<Logger>;
  } = {},
) {
  const emailSender: EmailSender = {
    send: vi.fn().mockResolvedValue(undefined),
    ...overrides.emailSender,
  };
  const logger: Logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    ...overrides.logger,
  };

  return {
    sut: new CrearConsignmentUseCase(emailSender, logger, 'juanfer@jfpropiedadraiz.com'),
    emailSender,
    logger,
  };
}

describe('CrearConsignmentUseCase', () => {
  it('envía ambos correos y retorna enviado=true cuando todo es válido', async () => {
    const { sut, emailSender } = makeSut();

    const resultado = await sut.execute({ input: inputBase });

    expect(resultado.enviado).toBe(true);
    expect(emailSender.send).toHaveBeenCalledTimes(2);
    expect(emailSender.send).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      'Nueva solicitud de consignación de propiedad',
      expect.any(String),
    );
    expect(emailSender.send).toHaveBeenNthCalledWith(
      2,
      'cliente@ejemplo.com',
      'Recibo de tu solicitud de consignación',
      expect.any(String),
    );
  });

  it('retorna enviado=false y no envía correos cuando el honeypot `sitio` tiene valor (AC3.4.1)', async () => {
    const { sut, emailSender } = makeSut();

    const resultado = await sut.execute({
      input: { ...inputBase, sitio: 'valor-del-bot' },
    });

    expect(resultado.enviado).toBe(false);
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it('rechaza con CONSENT_REQUIRED cuando consent es falso (AC3.3.2)', async () => {
    const { sut } = makeSut();

    await expect(sut.execute({ input: { ...inputBase, consent: false } })).rejects.toMatchObject({
      code: 'CONSENT_REQUIRED',
    });
  });

  it('rechaza con CONSENT_REQUIRED cuando consent está ausente', async () => {
    const { sut } = makeSut();

    const { consent: _consent, ...sinConsent } = inputBase;

    await expect(sut.execute({ input: sinConsent as ConsignmentInput })).rejects.toMatchObject({
      code: 'CONSENT_REQUIRED',
    });
  });

  it('rechaza con EMAIL_DELIVERY_FAILED cuando falla el correo a Juan (AC3.2.4)', async () => {
    const { sut, emailSender } = makeSut({
      emailSender: {
        send: vi.fn().mockImplementation((to) => {
          if (to === 'juanfer@jfpropiedadraiz.com') throw new Error('fallo resend');
          return Promise.resolve();
        }),
      },
    });

    await expect(sut.execute({ input: inputBase })).rejects.toMatchObject({
      code: 'EMAIL_DELIVERY_FAILED',
    });
    expect(emailSender.send).toHaveBeenCalledTimes(1);
  });

  it('rechaza con EMAIL_DELIVERY_FAILED cuando falla el recibo al solicitante', async () => {
    const { sut, emailSender } = makeSut({
      emailSender: {
        send: vi.fn().mockImplementation((to) => {
          if (to === 'cliente@ejemplo.com') throw new Error('fallo resend');
          return Promise.resolve();
        }),
      },
    });

    await expect(sut.execute({ input: inputBase })).rejects.toMatchObject({
      code: 'EMAIL_DELIVERY_FAILED',
    });
    expect(emailSender.send).toHaveBeenCalledTimes(2);
  });
});
