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
      'cliente@ejemplo.com',
    );
    expect(emailSender.send).toHaveBeenNthCalledWith(
      2,
      'cliente@ejemplo.com',
      'Recibo de tu solicitud de consignación',
      expect.any(String),
    );
  });

  async function htmlsDe(
    input: ConsignmentInput,
  ): Promise<{ notificacion: string; recibo: string }> {
    const { sut, emailSender } = makeSut();
    await sut.execute({ input });
    const llamadas = vi.mocked(emailSender.send).mock.calls;
    const notificacion = llamadas[0]?.[2];
    const recibo = llamadas[1]?.[2];
    if (typeof notificacion !== 'string' || typeof recibo !== 'string') {
      throw new Error('Se esperaban dos correos con HTML');
    }
    return { notificacion, recibo };
  }

  async function htmlNotificacionDe(input: ConsignmentInput): Promise<string> {
    return (await htmlsDe(input)).notificacion;
  }

  function extraerTextoWhatsApp(html: string): string {
    const textoCodificado = html.match(/https:\/\/wa\.me\/573001234567\?text=([^"&]+)/)?.[1];
    if (textoCodificado === undefined) throw new Error('Falta el texto de WhatsApp');
    return decodeURIComponent(textoCodificado);
  }

  it('incluye enlace de WhatsApp con teléfono solo dígitos y texto prellenado (AC3.2.2)', async () => {
    const html = await htmlNotificacionDe(inputBase);

    expect(html).toContain('https://wa.me/573001234567?text=');
    const texto = extraerTextoWhatsApp(html);
    expect(texto.length).toBeGreaterThan(0);
  });

  it('el texto prellenado de WhatsApp difiere entre idioma es y en (AC3.2.2)', async () => {
    const textoEs = extraerTextoWhatsApp(await htmlNotificacionDe({ ...inputBase, idioma: 'es' }));
    const textoEn = extraerTextoWhatsApp(await htmlNotificacionDe({ ...inputBase, idioma: 'en' }));

    expect(textoEs.length).toBeGreaterThan(0);
    expect(textoEn.length).toBeGreaterThan(0);
    expect(textoEs).not.toBe(textoEn);
  });

  it('marca estructura e idioma por defecto es en ambos correos (AC3.2.1)', async () => {
    const { notificacion, recibo } = await htmlsDe(inputBase);

    expect(notificacion).toContain('data-correo="notificacion"');
    expect(notificacion).toContain('data-idioma="es"');
    expect(notificacion).toContain('data-seccion="propietario"');
    expect(notificacion).toContain('data-seccion="propiedad"');
    expect(notificacion).toContain('data-campo="whatsapp"');
    expect(recibo).toContain('data-correo="recibo"');
    expect(recibo).toContain('data-idioma="es"');
    expect(recibo).toContain('data-seccion="siguiente"');
    expect(recibo).toContain('data-campo="saludo"');
  });

  it('propaga el idioma en al atributo lang y en los marcadores cuando se elige en', async () => {
    const { notificacion, recibo } = await htmlsDe({ ...inputBase, idioma: 'en' });

    expect(notificacion).toContain('<html lang="en">');
    expect(notificacion).toContain('data-idioma="en"');
    expect(recibo).toContain('<html lang="en">');
    expect(recibo).toContain('data-idioma="en"');
  });

  it('incluye fecha de America/Bogota en el preheader de la notificación (AC3.2.1)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-24T12:00:00.000Z'));
    try {
      const es = await htmlNotificacionDe(inputBase);
      const en = await htmlNotificacionDe({ ...inputBase, idioma: 'en' });

      expect(es).toContain(
        '<span style="display:none">Solicitud de consignación recibida · 24 de noviembre de 2026</span>',
      );
      expect(en).toContain(
        '<span style="display:none">Consignment request received · November 24, 2026</span>',
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('escapa HTML en datos del solicitante en ambos correos', async () => {
    const { notificacion, recibo } = await htmlsDe({
      ...inputBase,
      nombre: '<script>alert(1)</script>',
      mensaje: '<img src=x onerror=alert(1)>',
    });

    expect(notificacion).not.toContain('<script>alert(1)</script>');
    expect(notificacion).not.toContain('<img src=x onerror=alert(1)>');
    expect(notificacion).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(recibo).not.toContain('<script>alert(1)</script>');
    expect(recibo).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('incluye filas opcionales cuando el solicitante las envía', async () => {
    const html = await htmlNotificacionDe({
      ...inputBase,
      valor: 250000000,
      areaConstruida: 120,
      areaLote: 450,
      mensaje: 'Mensaje de prueba',
    });

    expect(html).toContain('data-campo="valor"');
    expect(html).toContain('data-campo="area-construida"');
    expect(html).toContain('data-campo="area-lote"');
    expect(html).toContain('data-campo="mensaje"');
  });

  it('omite filas opcionales cuando el solicitante no las envía', async () => {
    const html = await htmlNotificacionDe(inputBase);

    expect(html).not.toContain('data-campo="valor"');
    expect(html).not.toContain('data-campo="area-construida"');
    expect(html).not.toContain('data-campo="area-lote"');
    expect(html).not.toContain('data-campo="mensaje"');
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

  it('resuelve con enviado=true y advierte una vez cuando falla el recibo al solicitante', async () => {
    const { sut, emailSender, logger } = makeSut({
      emailSender: {
        send: vi.fn().mockImplementation((to) => {
          if (to === 'cliente@ejemplo.com') throw new Error('fallo resend');
          return Promise.resolve();
        }),
      },
    });

    const resultado = await sut.execute({ input: inputBase });

    expect(resultado).toEqual({ enviado: true });
    expect(emailSender.send).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'consignment_email_recibo_failed',
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  it('rechaza con EMAIL_DELIVERY_FAILED cuando el correo a Juan falla con error del SDK', async () => {
    const { sut, emailSender } = makeSut({
      emailSender: {
        send: vi.fn().mockImplementation((to) => {
          if (to === 'juanfer@jfpropiedadraiz.com')
            throw new Error('Resend error: Invalid API key');
          return Promise.resolve();
        }),
      },
    });

    await expect(sut.execute({ input: inputBase })).rejects.toMatchObject({
      code: 'EMAIL_DELIVERY_FAILED',
    });
    expect(emailSender.send).toHaveBeenCalledTimes(1);
  });

  it('resuelve con enviado=true y advierte una vez cuando el recibo al solicitante falla con error del SDK', async () => {
    const { sut, emailSender, logger } = makeSut({
      emailSender: {
        send: vi.fn().mockImplementation((to) => {
          if (to === 'cliente@ejemplo.com') throw new Error('Resend error: Invalid API key');
          return Promise.resolve();
        }),
      },
    });

    const resultado = await sut.execute({ input: inputBase });

    expect(resultado).toEqual({ enviado: true });
    expect(emailSender.send).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'consignment_email_recibo_failed',
      expect.objectContaining({ error: expect.any(String) }),
    );
  });

  it('usa logo por URL placeholder en ambos correos (sin data URI ni wordmark)', async () => {
    const { notificacion, recibo } = await htmlsDe(inputBase);

    expect(notificacion).toContain(
      '<img src="https://placehold.co/160x160/042316/C9A24D/png?text=JF"',
    );
    expect(notificacion).toContain('alt="JF Propiedad Raíz"');
    expect(recibo).toContain('<img src="https://placehold.co/160x160/042316/C9A24D/png?text=JF"');
    expect(recibo).toContain('alt="JF Propiedad Raíz"');
    expect(notificacion).not.toContain('data:image');
    expect(recibo).not.toContain('data:image');
  });

  it('reproduce tokens visuales de la referencia en ambos correos y sin prefers-color-scheme', async () => {
    const { notificacion, recibo } = await htmlsDe(inputBase);

    for (const html of [notificacion, recibo]) {
      expect(html).toContain('background-color:#EFECE6');
      expect(html).toContain('background-color:#FAF8F3');
      expect(html).toContain('border:1px solid #D9CEB2');
      expect(html).toContain('border-radius:4px');
      expect(html).toContain('background-color:#042316');
      expect(html).toContain('border-bottom:3px solid #C9A24D');
      expect(html).toContain("font-family:'Helvetica Neue', Helvetica, Arial, sans-serif");
      expect(html).toContain("font-family:Georgia, 'Times New Roman', serif");
      expect(html).not.toContain('prefers-color-scheme');
    }

    expect(notificacion).toContain('data-seccion="pie"');
    expect(notificacion).toContain('background-color:#F2EEE4');
    expect(notificacion).toContain('color:#E8CF88');
    expect(notificacion).toContain('border:1px solid #C9A24D');
    expect(notificacion).toContain('border-radius:2px');
    expect(notificacion).toContain('<strong style="color:#042316;">JF Propiedad Raíz</strong>');
    expect(recibo).toContain('data-seccion="pie"');
    expect(recibo).toContain('background-color:#FFFFFF');
    expect(recibo).toContain('border-left:4px solid #C9A24D');
  });
});
