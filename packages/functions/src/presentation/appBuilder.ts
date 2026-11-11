import express, { type Express } from 'express';

import type { UseCases } from '../application/buildUseCases';
import type { Logger } from '../application/ports/logger';
import type { SecretComparator } from '../application/ports/secret-comparator';
import { makeErrorMiddleware } from './middlewares/error';
import { notFoundMiddleware } from './middlewares/not-found';
import { requestId } from './middlewares/request-id';
import { apiRouter } from './routes';

export interface ApiDeps {
  readonly internalKey: string;
  readonly logger: Logger;
  readonly secretComparator: SecretComparator;
}

export function appBuilder(useCases: UseCases, deps: ApiDeps): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(requestId);
  app.use(apiRouter(useCases, deps));
  app.use(notFoundMiddleware);
  app.use(makeErrorMiddleware(deps.logger));

  return app;
}
