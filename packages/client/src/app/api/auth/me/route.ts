/**
 * GET /api/auth/me — identidad de la sesión verificada (session).
 */

import { bffRoute, envelope, errorEnvelope } from '@/server/bff-helper';

export const GET = bffRoute(async (_request, ctx) => {
  if (!ctx.claims) {
    return errorEnvelope('UNAUTHORIZED', 'Sesión inválida o ausente.', 401);
  }

  const { sub: uid, email, role } = ctx.claims;
  return envelope({ user: { uid, email, role }, authenticated: true }, 200, 'Sesión válida');
});
