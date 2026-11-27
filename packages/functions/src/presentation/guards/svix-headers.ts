import type { RequestHandler } from 'express';

import { z } from 'zod';

/**
 * Exige las cabeceras Svix del webhook de delivery de Resend antes del rate limiter.
 *
 * Sin `svix-id`, `svix-timestamp` y `svix-signature` no se puede verificar la
 * firma del webhook, así que la petición se rechaza con 422 antes de limitar
 * por tasa.
 */
const SvixHeadersSchema = z.object({
  'svix-id': z.string().min(1),
  'svix-timestamp': z.string().min(1),
  'svix-signature': z.string().min(1),
});

export const svixHeadersGuard: RequestHandler = (req, _res, next) => {
  const result = SvixHeadersSchema.safeParse(req.headers);

  if (!result.success) {
    next(result.error);
    return;
  }

  next();
};
