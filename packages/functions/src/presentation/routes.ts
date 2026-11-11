import { Router, type RequestHandler } from 'express';

import type { UseCases } from '../application/buildUseCases';
import type { ApiDeps } from './appBuilder';
import { internalKeyGuard } from './guards/internal-key';
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

export function apiRouter(useCases: UseCases, deps: ApiDeps): Router {
  const router = Router();
  const handlers = buildHandlers(useCases);
  const guardInternal = internalKeyGuard(deps);

  const routes: readonly RouteDeclaration[] = [
    {
      method: 'post',
      path: API_PATHS.verifyInternalSession,
      guards: [guardInternal],
      handler: handlers.verifyInternalSession,
    },
    {
      method: 'get',
      path: OPS_PATHS.health,
      guards: [],
      handler: handlers.health,
    },
    // Propiedades — escritura (requieren sesión de admin vía X-Internal-Key + X-User-*)
    {
      method: 'post',
      path: API_PATHS.properties,
      guards: [guardInternal],
      handler: handlers.createProperty,
    },
    {
      method: 'put',
      path: API_PATHS.property,
      guards: [guardInternal],
      handler: handlers.updateProperty,
    },
    {
      method: 'delete',
      path: API_PATHS.property,
      guards: [guardInternal],
      handler: handlers.deleteProperty,
    },
    {
      method: 'post',
      path: API_PATHS.activateProperty,
      guards: [guardInternal],
      handler: handlers.activateProperty,
    },
    {
      method: 'post',
      path: API_PATHS.hideProperty,
      guards: [guardInternal],
      handler: handlers.hideProperty,
    },
    // Propiedades — lectura pública (sin sesión)
    {
      method: 'get',
      path: API_PATHS.properties,
      guards: [],
      handler: handlers.listProperties,
    },
    {
      method: 'get',
      path: API_PATHS.featuredProperties,
      guards: [],
      handler: handlers.listProperties,
    },
    {
      method: 'get',
      path: API_PATHS.property,
      guards: [],
      handler: handlers.obtenerProperty,
    },
    // Media — presignar y confirmar subida (requieren sesión de admin)
    {
      method: 'post',
      path: API_PATHS.presignedMediaUrl,
      guards: [guardInternal],
      handler: handlers.presignMediaUpload,
    },
    {
      method: 'post',
      path: API_PATHS.confirmMedia,
      guards: [guardInternal],
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
