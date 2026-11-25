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
import {
  construirHtmlNotificacion,
  construirHtmlRecibo,
} from '../../email/plantillas-consignacion';

type ConsignmentInput = BackendSpec.components['schemas']['ConsignmentInput'];

export interface CrearConsignmentCommand {
  readonly input: ConsignmentInput;
}

export interface CrearConsignmentResult {
  readonly enviado: boolean;
}

const ASUNTO_NOTIFICACION_CONSIGNACION = 'Nueva solicitud de consignación de propiedad';
const ASUNTO_RECIBO = 'Recibo de tu solicitud de consignación';

export class CrearConsignmentUseCase implements UseCase<
  CrearConsignmentCommand,
  CrearConsignmentResult
> {
  constructor(
    private readonly emailSender: EmailSender,
    private readonly logger: Logger,
    private readonly consignmentToEmail: string,
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

    const idioma = input.idioma ?? 'es';

    // AC3.2.1 / AC3.2.3 — Correo a Juan Fernando con los datos del solicitante.
    const htmlNotificacion = construirHtmlNotificacion(input, idioma);
    try {
      await this.emailSender.send(
        this.consignmentToEmail,
        ASUNTO_NOTIFICACION_CONSIGNACION,
        htmlNotificacion,
        input.email,
      );
    } catch (error) {
      this.logger.warn('consignment_email_juan_failed', { error: String(error) });
      throw new ApiError(
        errorCode.emailDeliveryFailed,
        'No se pudo enviar el correo de notificación',
      );
    }

    // AC3.2.2 — Recibo al solicitante.
    const htmlRecibo = construirHtmlRecibo(input, idioma);
    try {
      await this.emailSender.send(input.email, ASUNTO_RECIBO, htmlRecibo);
    } catch (error) {
      // El recibo es degradado: si falla, la solicitud sigue siendo exitosa
      // y solo se advierte. El correo a Juan (AC3.2.1) sigue siendo fatal.
      this.logger.warn('consignment_email_recibo_failed', { error: String(error) });
    }

    this.logger.info('consignment_created', { email: input.email });
    return { enviado: true };
  }
}
