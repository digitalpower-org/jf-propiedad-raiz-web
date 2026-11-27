import type { ApplicationPorts } from './ports';
import type { DeliveryWebhookVerifier } from './ports/delivery-webhook-verifier';
import type { AboutDto } from './ports/about-repository';
import { RevalidateContent } from './revalidation/revalidate-content';
import { TranslationService } from './translation/translation-service';
import { VerifyInternalSessionUseCase } from './use-cases/auth/verify-internal-session';
import { ActivarPropertyUseCase } from './use-cases/properties/activar-property';
import { ActualizarPropertyUseCase } from './use-cases/properties/actualizar-property';
import { CrearPropertyUseCase } from './use-cases/properties/crear-property';
import { EliminarPropertyUseCase } from './use-cases/properties/eliminar-property';
import { ListarFeaturedPropertiesUseCase } from './use-cases/properties/listar-featured-properties';
import { ListarPropertiesUseCase } from './use-cases/properties/listar-properties';
import { ObtenerPropertyUseCase } from './use-cases/properties/obtener-property';
import { OcultarPropertyUseCase } from './use-cases/properties/ocultar-property';
import { CrearConsignmentUseCase } from './use-cases/consignments/crear-consignment';
import { ObtenerNotificacionesResendUseCase } from './use-cases/consignments/obtener-notificaciones-resend';
import { RegistrarNotificacionResendUseCase } from './use-cases/consignments/registrar-notificacion-resend';
import { ListarServicesUseCase } from './use-cases/services/listar-services';
import { CrearServiceUseCase } from './use-cases/services/crear-services';
import { ActualizarServiceUseCase } from './use-cases/services/actualizar-services';
import { EliminarServiceUseCase } from './use-cases/services/eliminar-services';
import { ActivarServiceUseCase } from './use-cases/services/activar-services';
import { OcultarServiceUseCase } from './use-cases/services/ocultar-services';
import { ReordenarServiceUseCase } from './use-cases/services/reordenar-services';
import { ObtenerServiceUseCase } from './use-cases/services/obtener-services';
import { ObtenerAboutUseCase } from './use-cases/about/obtener-about';
import { ActualizarAboutUseCase } from './use-cases/about/actualizar-about';
import { ConfirmarMediaUploadUseCase } from './use-cases/media/confirmar-media-upload';
import { PresignMediaUploadUseCase } from './use-cases/media/presign-media-upload';
import type { RateLimiter } from './ports/rate-limiter';

export interface UseCases {
  readonly verifyInternalSession: VerifyInternalSessionUseCase;
  readonly translationService: TranslationService;
  readonly revalidateContent: RevalidateContent;
  readonly crearProperty: CrearPropertyUseCase;
  readonly actualizarProperty: ActualizarPropertyUseCase;
  readonly eliminarProperty: EliminarPropertyUseCase;
  readonly activarProperty: ActivarPropertyUseCase;
  readonly ocultarProperty: OcultarPropertyUseCase;
  readonly listarProperties: ListarPropertiesUseCase;
  readonly listarFeaturedProperties: ListarFeaturedPropertiesUseCase;
  readonly obtenerProperty: ObtenerPropertyUseCase;
  readonly listarServices: ListarServicesUseCase;
  readonly crearService: CrearServiceUseCase;
  readonly actualizarService: ActualizarServiceUseCase;
  readonly eliminarService: EliminarServiceUseCase;
  readonly activarService: ActivarServiceUseCase;
  readonly ocultarService: OcultarServiceUseCase;
  readonly reordenarService: ReordenarServiceUseCase;
  readonly obtenerService: ObtenerServiceUseCase;
  readonly obtenerAbout: ObtenerAboutUseCase;
  readonly actualizarAbout: ActualizarAboutUseCase;
  readonly presignMediaUpload: PresignMediaUploadUseCase;
  readonly confirmarMediaUpload: ConfirmarMediaUploadUseCase;
  readonly crearConsignment: CrearConsignmentUseCase;
  readonly obtenerEmailNotifications: ObtenerNotificacionesResendUseCase;
  readonly registrarNotificacionResend: RegistrarNotificacionResendUseCase;
  readonly deliveryWebhookVerifier: DeliveryWebhookVerifier;
  readonly rateLimiter: RateLimiter;
}

/** Único lugar donde se construyen los casos de uso. */
export function buildUseCases(
  ports: ApplicationPorts,
  config: {
    consignmentToEmail: string;
    aboutSeed: AboutDto;
    consignmentNotificationTtlSeconds: number;
  },
): UseCases {
  const revalidateContent = new RevalidateContent({
    gateway: ports.revalidationGateway,
    logger: ports.logger,
  });

  const translationService = new TranslationService({
    translator: ports.translator,
    logger: ports.logger,
  });

  return {
    verifyInternalSession: new VerifyInternalSessionUseCase(
      ports.identityVerifier,
      ports.authorizedUsers,
      ports.logger,
    ),
    translationService,
    revalidateContent,
    crearProperty: new CrearPropertyUseCase(
      ports.properties,
      revalidateContent,
      ports.videoValidator,
      ports.logger,
      translationService,
    ),
    actualizarProperty: new ActualizarPropertyUseCase(
      ports.properties,
      revalidateContent,
      ports.videoValidator,
      ports.logger,
      translationService,
    ),
    eliminarProperty: new EliminarPropertyUseCase(
      ports.properties,
      revalidateContent,
      ports.logger,
    ),
    activarProperty: new ActivarPropertyUseCase(ports.properties, revalidateContent, ports.logger),
    ocultarProperty: new OcultarPropertyUseCase(ports.properties, revalidateContent, ports.logger),
    listarProperties: new ListarPropertiesUseCase(ports.properties, ports.logger),
    listarFeaturedProperties: new ListarFeaturedPropertiesUseCase(ports.properties, ports.logger),
    obtenerProperty: new ObtenerPropertyUseCase(ports.properties, ports.logger),
    listarServices: new ListarServicesUseCase(ports.services, ports.logger),
    crearService: new CrearServiceUseCase({
      services: ports.services,
      revalidateContent,
      mediaStorage: ports.mediaStorage,
      translationService,
      logger: ports.logger,
    }),
    actualizarService: new ActualizarServiceUseCase({
      services: ports.services,
      revalidateContent,
      mediaStorage: ports.mediaStorage,
      translationService,
      logger: ports.logger,
    }),
    eliminarService: new EliminarServiceUseCase({
      services: ports.services,
      revalidateContent,
      mediaStorage: ports.mediaStorage,
      logger: ports.logger,
    }),
    activarService: new ActivarServiceUseCase({
      services: ports.services,
      revalidateContent,
      mediaStorage: ports.mediaStorage,
      logger: ports.logger,
    }),
    ocultarService: new OcultarServiceUseCase({
      services: ports.services,
      revalidateContent,
      mediaStorage: ports.mediaStorage,
      logger: ports.logger,
    }),
    reordenarService: new ReordenarServiceUseCase({
      services: ports.services,
      revalidateContent,
      mediaStorage: ports.mediaStorage,
      logger: ports.logger,
    }),
    obtenerService: new ObtenerServiceUseCase(ports.services, ports.logger),
    obtenerAbout: new ObtenerAboutUseCase({
      about: ports.about,
      seed: config.aboutSeed,
      logger: ports.logger,
    }),
    actualizarAbout: new ActualizarAboutUseCase({
      about: ports.about,
      revalidateContent,
      mediaStorage: ports.mediaStorage,
      translationService,
      logger: ports.logger,
    }),
    presignMediaUpload: new PresignMediaUploadUseCase(ports.mediaStorage, ports.logger),
    confirmarMediaUpload: new ConfirmarMediaUploadUseCase(ports.mediaStorage, ports.logger),
    crearConsignment: new CrearConsignmentUseCase(
      ports.emailSender,
      ports.logger,
      config.consignmentToEmail,
    ),
    obtenerEmailNotifications: new ObtenerNotificacionesResendUseCase(
      ports.consignmentEmailNotificationRepository,
      ports.logger,
    ),
    registrarNotificacionResend: new RegistrarNotificacionResendUseCase(
      ports.consignmentEmailNotificationRepository,
      ports.logger,
      config.consignmentNotificationTtlSeconds,
    ),
    deliveryWebhookVerifier: ports.deliveryWebhookVerifier,
    rateLimiter: ports.rateLimiter,
  };
}
