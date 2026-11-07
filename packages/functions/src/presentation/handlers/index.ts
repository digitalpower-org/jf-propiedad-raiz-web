import type { RequestHandler } from 'express';

import type { UseCases } from '../../application/buildUseCases';
import { makeVerifyInternalSessionHandler } from './auth/verify-internal-session';
import { healthHandler } from './health';
import type { AsyncHandler } from './types';

export interface Handlers {
  readonly verifyInternalSession: AsyncHandler;
  readonly health: RequestHandler;
}

export function buildHandlers(useCases: UseCases): Handlers {
  return {
    verifyInternalSession: makeVerifyInternalSessionHandler(useCases.verifyInternalSession),
    health: healthHandler,
  };
}
