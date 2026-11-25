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
import { makeListFeaturedPropertiesHandler } from './properties/list-featured-properties';
import { makeListServicesHandler } from './services/list-services';
import { makeGetServiceHandler } from './services/get-service';
import { makeCreateServiceHandler } from './services/create-services';
import { makeUpdateServiceHandler } from './services/update-services';
import { makeDeleteServiceHandler } from './services/delete-services';
import { makeActivateServiceHandler } from './services/activate-services';
import { makeHideServiceHandler } from './services/hide-services';
import { makeReorderServiceHandler } from './services/reorder-services';
import { makeGetAboutHandler } from './about/get-about';
import { makeUpdateAboutHandler } from './about/update-about';
import { makePresignMediaUploadHandler } from './media/presign-media-upload';
import { makeConfirmarMediaUploadHandler } from './media/confirm-media-upload';
import { makeCreateConsignmentHandler } from './consignments/create-consignment';
import { makeGetEmailNotificationsHandler } from './consignments/get-email-notifications';
import { makeResendDeliveryWebhookHandler } from './consignments/resend-delivery-webhook';
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
  readonly listFeaturedProperties: AsyncHandler;
  readonly listServices: AsyncHandler;
  readonly getService: AsyncHandler;
  readonly createService: AsyncHandler;
  readonly updateService: AsyncHandler;
  readonly deleteService: AsyncHandler;
  readonly activateService: AsyncHandler;
  readonly hideService: AsyncHandler;
  readonly reorderService: AsyncHandler;
  readonly getAbout: AsyncHandler;
  readonly updateAbout: AsyncHandler;
  readonly presignMediaUpload: AsyncHandler;
  readonly confirmarMediaUpload: AsyncHandler;
  readonly createConsignment: AsyncHandler;
  readonly getEmailNotifications: AsyncHandler;
  readonly resendDeliveryWebhook: AsyncHandler;
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
    listFeaturedProperties: makeListFeaturedPropertiesHandler(useCases.listarFeaturedProperties),
    listServices: makeListServicesHandler(useCases.listarServices),
    getService: makeGetServiceHandler(useCases.obtenerService),
    createService: makeCreateServiceHandler(useCases.crearService),
    updateService: makeUpdateServiceHandler(useCases.actualizarService),
    deleteService: makeDeleteServiceHandler(useCases.eliminarService),
    activateService: makeActivateServiceHandler(useCases.activarService),
    hideService: makeHideServiceHandler(useCases.ocultarService),
    reorderService: makeReorderServiceHandler(useCases.reordenarService),
    getAbout: makeGetAboutHandler(useCases.obtenerAbout),
    updateAbout: makeUpdateAboutHandler(useCases.actualizarAbout),
    presignMediaUpload: makePresignMediaUploadHandler(useCases.presignMediaUpload),
    confirmarMediaUpload: makeConfirmarMediaUploadHandler(useCases.confirmarMediaUpload),
    createConsignment: makeCreateConsignmentHandler(useCases.crearConsignment),
    getEmailNotifications: makeGetEmailNotificationsHandler(useCases.obtenerEmailNotifications),
    resendDeliveryWebhook: makeResendDeliveryWebhookHandler(
      useCases.deliveryWebhookVerifier,
      useCases.registrarNotificacionResend,
    ),
  };
}
