// US3.1 / US3.4 — Consignación: solicitud «Consigne su propiedad».
// No se persiste ningún dato (D11, AC3.1.7). Envía dos correos vía Resend
// (US3.2): uno a Juan Fernando y un recibo al solicitante.
// El rate limiting (AC3.4.2) es responsabilidad del handler (presentación),
// no del caso de uso (dominio de negocio).

import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { EmailSender } from '../../ports/email-sender';
import type { BackendSpec } from '@jf/shared-types';
import { ApiError } from '../../../domain/errors/api-error';
import { errorCode } from '../../../domain/errors/errorCatalog';

type ConsignmentInput = BackendSpec.components['schemas']['ConsignmentInput'];

export interface CrearConsignmentCommand {
  readonly input: ConsignmentInput;
}

export interface CrearConsignmentResult {
  readonly enviado: boolean;
}

// const JUAN_EMAIL = process.env.JUAN_EMAIL ?? 'juanfer@jfpropiedadraiz.com';
const ASUNTO_JUAN = 'Nueva solicitud de consignación de propiedad';
const ASUNTO_RECIBO = 'Recibo de tu solicitud de consignación';

export class CrearConsignmentUseCase implements UseCase<
  CrearConsignmentCommand,
  CrearConsignmentResult
> {
  constructor(
    private readonly emailSender: EmailSender,
    private readonly logger: Logger,
    private readonly juanEmail: string,
  ) {}

  async execute(command: CrearConsignmentCommand): Promise<CrearConsignmentResult> {
    const { input } = command;

    // AC3.4.1 — Honeypot: si el campo oculto `sitio` tiene valor, éxito sin envío.
    if (input.sitio && input.sitio.trim().length > 0) {
      this.logger.debug('consignment_honeypot_blocked');
      return { enviado: false };
    }

    // AC3.3.1 / AC3.3.2 — Consentimiento obligatorio y nunca premarcado.
    if (!input.consent) {
      this.logger.debug('consignment_consent_required');
      throw new ApiError(
        errorCode.consentRequired,
        'Consentimiento de tratamiento de datos requerido',
      );
    }

    // AC3.2.1 / AC3.2.3 — Correo a Juan Fernando con los datos del solicitante.
    const htmlJuan = this.construirHtmlJuan(input);
    try {
      await this.emailSender.send(this.juanEmail, ASUNTO_JUAN, htmlJuan);
    } catch (error) {
      this.logger.warn('consignment_email_juan_failed', { error: String(error) });
      throw new ApiError(
        errorCode.emailDeliveryFailed,
        'No se pudo enviar el correo de notificación',
      );
    }

    // AC3.2.2 — Recibo al solicitante.
    const htmlRecibo = this.construirHtmlRecibo(input, input.idioma ?? 'es');
    try {
      await this.emailSender.send(input.email, ASUNTO_RECIBO, htmlRecibo);
    } catch (error) {
      this.logger.warn('consignment_email_recibo_failed', { error: String(error) });
      throw new ApiError(errorCode.emailDeliveryFailed, 'No se pudo enviar el correo de recibo');
    }

    this.logger.info('consignment_created', { email: input.email });
    return { enviado: true };
  }

  private construirHtmlJuan(input: ConsignmentInput): string {
    return `
      <h2>Nueva solicitud de consignación</h2>
      <p><strong>Nombre:</strong> ${this.escapeHtml(input.nombre)}</p>
      <p><strong>Teléfono:</strong> ${this.escapeHtml(input.telefono)}</p>
      <p><strong>Email:</strong> ${this.escapeHtml(input.email)}</p>
      <p><strong>Tipo de inmueble:</strong> ${this.escapeHtml(input.tipo)}</p>
      <p><strong>Ubicación:</strong> ${this.escapeHtml(input.departamento)}, ${this.escapeHtml(input.municipio)}</p>
      ${input.valor !== undefined ? `<p><strong>Valor solicitado:</strong> $${input.valor.toLocaleString()}</p>` : ''}
      ${input.areaConstruida !== undefined ? `<p><strong>Área construida:</strong> ${input.areaConstruida} m²</p>` : ''}
      ${input.areaLote !== undefined ? `<p><strong>Área de lote:</strong> ${input.areaLote} m²</p>` : ''}
      ${input.mensaje ? `<p><strong>Mensaje:</strong> ${this.escapeHtml(input.mensaje)}</p>` : ''}
      <p><strong>Idioma:</strong> ${input.idioma ?? 'es'}</p>
    `;
  }

  private construirHtmlRecibo(input: ConsignmentInput, idioma: 'es' | 'en'): string {
    if (idioma === 'en') {
      return `
        <h2>Receipt of your consignment request</h2>
        <p>Dear ${this.escapeHtml(input.nombre)},</p>
        <p>We have received your request to list your property. We will contact you shortly.</p>
        <p><strong>Property type:</strong> ${this.escapeHtml(input.tipo)}</p>
        <p><strong>Location:</strong> ${this.escapeHtml(input.departamento)}, ${this.escapeHtml(input.municipio)}</p>
      `;
    }
    return `
      <h2>Recibo de tu solicitud de consignación</h2>
      <p>Hola ${this.escapeHtml(input.nombre)},</p>
      <p>Hemos recibido tu solicitud para consignar tu propiedad. Nos comunicaremos contigo pronto.</p>
      <p><strong>Tipo de inmueble:</strong> ${this.escapeHtml(input.tipo)}</p>
      <p><strong>Ubicación:</strong> ${this.escapeHtml(input.departamento)}, ${this.escapeHtml(input.municipio)}</p>
    `;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
