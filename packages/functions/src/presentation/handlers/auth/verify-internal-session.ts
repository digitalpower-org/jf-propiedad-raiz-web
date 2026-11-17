import { z } from 'zod';

import type { RateLimiter, RateLimitedError } from '../../../application/ports/rate-limiter';
import type {
  VerifiedIdentity,
  VerifyInternalSessionUseCase,
} from '../../../application/use-cases/auth/verify-internal-session';
import { ApiError } from '../../../domain/errors/api-error';
import { errorCode } from '../../../domain/errors/errorCatalog';
import { writeSuccess } from '../../protocol';
import type { AsyncHandler } from '../types';

const bodySchema = z.object({ idToken: z.string().min(1) });

export const makeVerifyInternalSessionHandler =
  (useCase: VerifyInternalSessionUseCase, rateLimiter: RateLimiter): AsyncHandler =>
  async (req, res, next) => {
    try {
      try {
        await rateLimiter.check('internal-auth-verify', 30, 60);
      } catch (error) {
        if ((error as RateLimitedError).code === 'RATE_LIMITED') {
          throw new ApiError(errorCode.rateLimited, 'Límite de solicitudes excedido');
        }
        throw error;
      }

      const body = bodySchema.parse(req.body);
      const identity = await useCase.execute({ idToken: body.idToken });
      writeSuccess<VerifiedIdentity>(res, identity, 'Identidad verificada');
    } catch (error) {
      next(error);
    }
  };
