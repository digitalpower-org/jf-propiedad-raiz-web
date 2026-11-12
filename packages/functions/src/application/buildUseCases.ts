import type { ApplicationPorts } from './ports';
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
import { ListarServicesUseCase } from './use-cases/services/listar-services';
import { ObtenerAboutUseCase } from './use-cases/about/obtener-about';
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
  readonly obtenerAbout: ObtenerAboutUseCase;
  readonly presignMediaUpload: PresignMediaUploadUseCase;
  readonly confirmarMediaUpload: ConfirmarMediaUploadUseCase;
  readonly crearConsignment: CrearConsignmentUseCase;
  readonly rateLimiter: RateLimiter;
}

/** Único lugar donde se construyen los casos de uso. */
export function buildUseCases(ports: ApplicationPorts, config: { juanEmail: string }): UseCases {
  const revalidateContent = new RevalidateContent({
    gateway: ports.revalidationGateway,
    logger: ports.logger,
  });

  return {
    verifyInternalSession: new VerifyInternalSessionUseCase(
      ports.identityVerifier,
      ports.authorizedUsers,
      ports.logger,
    ),
    translationService: new TranslationService({
      translator: ports.translator,
      logger: ports.logger,
    }),
    revalidateContent,
    crearProperty: new CrearPropertyUseCase(ports.properties, revalidateContent, ports.logger),
    actualizarProperty: new ActualizarPropertyUseCase(
      ports.properties,
      revalidateContent,
      ports.logger,
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
    obtenerAbout: new ObtenerAboutUseCase(ports.about, ports.logger),
    presignMediaUpload: new PresignMediaUploadUseCase(ports.mediaStorage, ports.logger),
    confirmarMediaUpload: new ConfirmarMediaUploadUseCase(ports.mediaStorage, ports.logger),
    crearConsignment: new CrearConsignmentUseCase(
      ports.emailSender,
      ports.logger,
      config.juanEmail,
    ),
    rateLimiter: ports.rateLimiter,
  };
}
