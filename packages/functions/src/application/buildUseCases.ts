import type { ApplicationPorts } from './ports';
import { RevalidateContent } from './revalidation/revalidate-content';
import { TranslationService } from './translation/translation-service';
import { VerifyInternalSessionUseCase } from './use-cases/auth/verify-internal-session';
import { ActivarPropertyUseCase } from './use-cases/properties/activar-property';
import { ActualizarPropertyUseCase } from './use-cases/properties/actualizar-property';
import { CrearPropertyUseCase } from './use-cases/properties/crear-property';
import { EliminarPropertyUseCase } from './use-cases/properties/eliminar-property';
import { ListarPropertiesUseCase } from './use-cases/properties/listar-properties';
import { ObtenerPropertyUseCase } from './use-cases/properties/obtener-property';
import { OcultarPropertyUseCase } from './use-cases/properties/ocultar-property';
import { ConfirmarMediaUploadUseCase } from './use-cases/media/confirmar-media-upload';
import { PresignMediaUploadUseCase } from './use-cases/media/presign-media-upload';

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
  readonly obtenerProperty: ObtenerPropertyUseCase;
  readonly presignMediaUpload: PresignMediaUploadUseCase;
  readonly confirmarMediaUpload: ConfirmarMediaUploadUseCase;
}

/** Único lugar donde se construyen los casos de uso. */
export function buildUseCases(ports: ApplicationPorts): UseCases {
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
    crearProperty: new CrearPropertyUseCase(
      ports.properties,
      revalidateContent,
      ports.logger,
    ),
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
    activarProperty: new ActivarPropertyUseCase(
      ports.properties,
      revalidateContent,
      ports.logger,
    ),
    ocultarProperty: new OcultarPropertyUseCase(
      ports.properties,
      revalidateContent,
      ports.logger,
    ),
    listarProperties: new ListarPropertiesUseCase(ports.properties, ports.logger),
    obtenerProperty: new ObtenerPropertyUseCase(ports.properties, ports.logger),
    presignMediaUpload: new PresignMediaUploadUseCase(
      ports.mediaStorage,
      ports.logger,
    ),
    confirmarMediaUpload: new ConfirmarMediaUploadUseCase(
      ports.mediaStorage,
      ports.logger,
    ),
  };
}
