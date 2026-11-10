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
  ];

  for (const route of routes) {
    register(router, route);
  }

  for (const path of new Set(routes.map((route) => route.path))) {
    router.all(path, methodNotAllowed);
  }

  return router;
}
