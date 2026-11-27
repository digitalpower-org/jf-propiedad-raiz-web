import { Router, type RequestHandler } from 'express';

import type { UseCases } from '../application/buildUseCases';
import type { ApiDeps } from './appBuilder';
import { internalKeyGuard } from './guards/internal-key';
import { requireClientIp } from './guards/client-ip';
import {
  clientIpKey,
  fixedKey,
  identityKey,
  makeFailOpenRateLimitGuard,
  makeRateLimitGuard,
  publicReadKey,
  socketIpKey,
} from './guards/rate-limit';
import { svixHeadersGuard } from './guards/svix-headers';
import { optionalAdminIdentity, requireUserIdentity } from './guards/user-identity';
import { buildHandlers } from './handlers';
import { methodNotAllowed } from './middlewares/method-not-allowed';
import { API_PATHS, OPS_PATHS } from './paths';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface RouteDeclaration {
  readonly method: HttpMethod;
  readonly path: string;
  readonly guards: readonly RequestHandler[];
  readonly handler: RequestHandler;
}

function register(router: Router, route: RouteDeclaration): void {
  switch (route.method) {
    case 'get':
      router.get(route.path, ...route.guards, route.handler);
      return;
    case 'post':
      router.post(route.path, ...route.guards, route.handler);
      return;
    case 'put':
      router.put(route.path, ...route.guards, route.handler);
      return;
    case 'patch':
      router.patch(route.path, ...route.guards, route.handler);
      return;
    case 'delete':
      router.delete(route.path, ...route.guards, route.handler);
      return;
  }
}

/**
 * Asigna el `name` de una función manejadora para que los tests de rutas puedan
 * identificar cada guard por nombre (el `name` del config del rate limiter).
 * `Function.name` es configurable, por lo que se redefine sin casts.
 */
function withName(handler: RequestHandler, name: string): RequestHandler {
  Object.defineProperty(handler, 'name', { value: name, configurable: true });
  return handler;
}

function publicReadGuard(useCases: UseCases, deps: ApiDeps, name: string, limit: number) {
  return withName(
    makeRateLimitGuard(useCases.rateLimiter, deps.logger, {
      name,
      keyFrom: publicReadKey,
      limit,
      windowSeconds: 60,
      message: 'Límite de solicitudes excedido',
    }),
    name,
  );
}

export function apiRouter(useCases: UseCases, deps: ApiDeps): Router {
  const router = Router();
  const handlers = buildHandlers(useCases);
  const guardInternal = withName(internalKeyGuard(deps), 'guard-internal');
  const requireClientIpGuard = withName(requireClientIp, 'require-client-ip');
  const requireUserIdentityGuard = withName(requireUserIdentity, 'require-user-identity');
  const optionalAdmin = withName(optionalAdminIdentity, 'optional-admin-identity');

  // Instanciados una vez por router; el orden es guardInternal → (IP/identidad) → rateLimit → handler.
  const rateVerify = withName(
    makeRateLimitGuard(useCases.rateLimiter, deps.logger, {
      name: 'rate-verify-internal-session',
      keyFrom: fixedKey('internal-auth-verify'),
      limit: 30,
      windowSeconds: 60,
      message: 'Límite de solicitudes excedido',
    }),
    'rate-verify-internal-session',
  );
  const rateHealth = withName(
    makeFailOpenRateLimitGuard(useCases.rateLimiter, deps.logger, {
      name: 'rate-health',
      keyFrom: socketIpKey,
      limit: 600,
      windowSeconds: 60,
      message: 'Límite de solicitudes excedido',
    }),
    'rate-health',
  );
  const rateConsignment = withName(
    makeRateLimitGuard(useCases.rateLimiter, deps.logger, {
      name: 'rate-consignment',
      keyFrom: clientIpKey,
      limit: 5,
      windowSeconds: 60,
      message: 'Límite de envíos excedido',
    }),
    'rate-consignment',
  );
  const rateAdminWrite = withName(
    makeRateLimitGuard(useCases.rateLimiter, deps.logger, {
      name: 'rate-admin-write',
      keyFrom: identityKey('admin-write'),
      limit: 60,
      windowSeconds: 60,
      message: 'Límite de solicitudes excedido',
    }),
    'rate-admin-write',
  );

  const readGuard = (name: string, limit: number) => publicReadGuard(useCases, deps, name, limit);
  const rateMediaPresign = withName(
    makeRateLimitGuard(useCases.rateLimiter, deps.logger, {
      name: 'rate-media-presign',
      keyFrom: identityKey('media-presign'),
      limit: 60,
      windowSeconds: 60,
      message: 'Límite de solicitudes excedido',
    }),
    'rate-media-presign',
  );
  const rateMediaConfirm = withName(
    makeRateLimitGuard(useCases.rateLimiter, deps.logger, {
      name: 'rate-media-confirm',
      keyFrom: identityKey('media-confirm'),
      limit: 60,
      windowSeconds: 60,
      message: 'Límite de solicitudes excedido',
    }),
    'rate-media-confirm',
  );
  const rateEmailNotifications = withName(
    makeRateLimitGuard(useCases.rateLimiter, deps.logger, {
      name: 'rate-email-notifications',
      keyFrom: fixedKey('email-notifications'),
      limit: 60,
      windowSeconds: 60,
      message: 'Límite de solicitudes excedido',
    }),
    'rate-email-notifications',
  );

  const requireSvixHeadersGuard = withName(svixHeadersGuard, 'svix-headers');
  const rateWebhook = withName(
    makeRateLimitGuard(useCases.rateLimiter, deps.logger, {
      name: 'rate-webhook',
      keyFrom: socketIpKey,
      limit: 600,
      windowSeconds: 60,
      message: 'Límite de solicitudes excedido',
    }),
    'rate-webhook',
  );

  const routes: readonly RouteDeclaration[] = [
    {
      method: 'post',
      path: API_PATHS.verifyInternalSession,
      guards: [guardInternal, rateVerify],
      handler: handlers.verifyInternalSession,
    },
    {
      method: 'get',
      path: OPS_PATHS.health,
      guards: [rateHealth],
      handler: handlers.health,
    },
    {
      method: 'post',
      path: API_PATHS.consignments,
      guards: [guardInternal, requireClientIpGuard, rateConsignment],
      handler: handlers.createConsignment,
    },
    {
      method: 'post',
      path: API_PATHS.resendDeliveryWebhook,
      guards: [requireSvixHeadersGuard, rateWebhook],
      handler: handlers.resendDeliveryWebhook,
    },
    {
      method: 'get',
      path: API_PATHS.consignmentEmailNotifications,
      guards: [guardInternal, rateEmailNotifications],
      handler: handlers.getEmailNotifications,
    },
    // Propiedades — escritura (requieren sesión de admin vía X-Internal-Key + X-User-*)
    {
      method: 'post',
      path: API_PATHS.properties,
      guards: [guardInternal, requireUserIdentityGuard, rateAdminWrite],
      handler: handlers.createProperty,
    },
    {
      method: 'put',
      path: API_PATHS.property,
      guards: [guardInternal, requireUserIdentityGuard, rateAdminWrite],
      handler: handlers.updateProperty,
    },
    {
      method: 'delete',
      path: API_PATHS.property,
      guards: [guardInternal, requireUserIdentityGuard, rateAdminWrite],
      handler: handlers.deleteProperty,
    },
    {
      method: 'post',
      path: API_PATHS.activateProperty,
      guards: [guardInternal, requireUserIdentityGuard, rateAdminWrite],
      handler: handlers.activateProperty,
    },
    {
      method: 'post',
      path: API_PATHS.hideProperty,
      guards: [guardInternal, requireUserIdentityGuard, rateAdminWrite],
      handler: handlers.hideProperty,
    },
    // Propiedades — lectura pública (sin sesión obligatoria; identidad opcional para incluir HIDDEN)
    {
      method: 'get',
      path: API_PATHS.properties,
      guards: [guardInternal, optionalAdmin, readGuard('rate-public-properties-list', 60)],
      handler: handlers.listProperties,
    },
    {
      method: 'get',
      path: API_PATHS.featuredProperties,
      guards: [guardInternal, readGuard('rate-public-featured', 120)],
      handler: handlers.listFeaturedProperties,
    },
    {
      method: 'get',
      path: API_PATHS.property,
      guards: [guardInternal, optionalAdmin, readGuard('rate-public-property-detail', 60)],
      handler: handlers.obtenerProperty,
    },
    {
      method: 'get',
      path: API_PATHS.services,
      guards: [guardInternal, optionalAdmin, readGuard('rate-public-services', 120)],
      handler: handlers.listServices,
    },
    {
      method: 'get',
      path: API_PATHS.service,
      guards: [guardInternal, optionalAdmin, readGuard('rate-public-service-detail', 60)],
      handler: handlers.getService,
    },
    // Servicios — escritura (requieren sesión de admin vía X-Internal-Key + X-User-*)
    {
      method: 'post',
      path: API_PATHS.services,
      guards: [guardInternal, requireUserIdentityGuard, rateAdminWrite],
      handler: handlers.createService,
    },
    {
      method: 'put',
      path: API_PATHS.service,
      guards: [guardInternal, requireUserIdentityGuard, rateAdminWrite],
      handler: handlers.updateService,
    },
    {
      method: 'delete',
      path: API_PATHS.service,
      guards: [guardInternal, requireUserIdentityGuard, rateAdminWrite],
      handler: handlers.deleteService,
    },
    {
      method: 'post',
      path: API_PATHS.activateService,
      guards: [guardInternal, requireUserIdentityGuard, rateAdminWrite],
      handler: handlers.activateService,
    },
    {
      method: 'post',
      path: API_PATHS.hideService,
      guards: [guardInternal, requireUserIdentityGuard, rateAdminWrite],
      handler: handlers.hideService,
    },
    {
      method: 'post',
      path: API_PATHS.reorderServices,
      guards: [guardInternal, requireUserIdentityGuard, rateAdminWrite],
      handler: handlers.reorderService,
    },
    {
      method: 'get',
      path: API_PATHS.about,
      guards: [guardInternal, readGuard('rate-public-about', 60)],
      handler: handlers.getAbout,
    },
    {
      method: 'put',
      path: API_PATHS.about,
      guards: [guardInternal, requireUserIdentityGuard, rateAdminWrite],
      handler: handlers.updateAbout,
    },
    // Media — presignar y confirmar subida (requieren sesión de admin)
    {
      method: 'post',
      path: API_PATHS.presignedMediaUrl,
      guards: [guardInternal, requireUserIdentityGuard, rateMediaPresign],
      handler: handlers.presignMediaUpload,
    },
    {
      method: 'post',
      path: API_PATHS.confirmMedia,
      guards: [guardInternal, requireUserIdentityGuard, rateMediaConfirm],
      handler: handlers.confirmarMediaUpload,
    },
  ];

  for (const route of routes) {
    register(router, route);
  }

  for (const path of new Set(routes.map((route) => route.path))) {
    router.all(path, methodNotAllowed);
  }

  return router;
}
