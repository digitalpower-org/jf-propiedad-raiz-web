import type { RequestHandler } from 'express';

import type { UseCases } from '../../application/buildUseCases';
import { makeVerifyInternalSessionHandler } from './auth/verify-internal-session';
import { healthHandler } from './health';
import { makeCreatePropertyHandler } from './properties/create-property';
import { makeUpdatePropertyHandler } from './properties/update-property';
import { makeDeletePropertyHandler } from './properties/delete-property';
import { makeActivatePropertyHandler } from './properties/activate-property';
import { makeHidePropertyHandler } from './properties/hide-property';
import { makeListPropertiesHandler } from './properties/list-properties';
import { makeObtenerPropertyHandler } from './properties/get-property';
import { makePresignMediaUploadHandler } from './media/presign-media-upload';
import { makeConfirmarMediaUploadHandler } from './media/confirm-media-upload';
import type { AsyncHandler } from './types';

export interface Handlers {
  readonly verifyInternalSession: AsyncHandler;
  readonly health: RequestHandler;
  readonly createProperty: AsyncHandler;
  readonly updateProperty: AsyncHandler;
  readonly deleteProperty: AsyncHandler;
  readonly activateProperty: AsyncHandler;
  readonly hideProperty: AsyncHandler;
  readonly listProperties: AsyncHandler;
  readonly obtenerProperty: AsyncHandler;
  readonly presignMediaUpload: AsyncHandler;
  readonly confirmarMediaUpload: AsyncHandler;
}

export function buildHandlers(useCases: UseCases): Handlers {
  return {
    verifyInternalSession: makeVerifyInternalSessionHandler(useCases.verifyInternalSession),
    health: healthHandler,
    createProperty: makeCreatePropertyHandler(useCases.crearProperty),
    updateProperty: makeUpdatePropertyHandler(useCases.actualizarProperty),
    deleteProperty: makeDeletePropertyHandler(useCases.eliminarProperty),
    activateProperty: makeActivatePropertyHandler(useCases.activarProperty),
    hideProperty: makeHidePropertyHandler(useCases.ocultarProperty),
    listProperties: makeListPropertiesHandler(useCases.listarProperties),
    obtenerProperty: makeObtenerPropertyHandler(useCases.obtenerProperty),
    presignMediaUpload: makePresignMediaUploadHandler(useCases.presignMediaUpload),
    confirmarMediaUpload: makeConfirmarMediaUploadHandler(useCases.confirmarMediaUpload),
  };
}
