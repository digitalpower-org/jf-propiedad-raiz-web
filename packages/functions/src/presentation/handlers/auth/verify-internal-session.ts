import { z } from 'zod';

import type {
  VerifiedIdentity,
  VerifyInternalSessionUseCase,
} from '../../../application/use-cases/auth/verify-internal-session';
import { writeSuccess } from '../../protocol';
import type { AsyncHandler } from '../types';

const bodySchema = z.object({ idToken: z.string().min(1) });

export const makeVerifyInternalSessionHandler =
  (useCase: VerifyInternalSessionUseCase): AsyncHandler =>
  async (req, res, next) => {
    try {
      const body = bodySchema.parse(req.body);
      const identity = await useCase.execute({ idToken: body.idToken });
      writeSuccess<VerifiedIdentity>(res, identity, 'Identidad verificada');
    } catch (error) {
      next(error);
    }
  };
