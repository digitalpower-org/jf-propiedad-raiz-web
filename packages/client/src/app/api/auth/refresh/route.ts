// POST /api/auth/refresh — renueva el JWT de sesión a partir de una cookie
// __session válida (fase 3.4, opción a: re-firma sin volver al idP).

import { bffRoute, envelope, errorEnvelope } from '@/server/bff-helper';
import { signSession } from '@/server/session/jwt';
import { env } from '@/server/config/server-config';

export const POST = bffRoute(async (_request, ctx) => {
  if (!ctx.claims) {
    return errorEnvelope('UNAUTHORIZED', 'Sesión inválida o ausente.', 401);
  }

  const { sub: uid, email, role } = ctx.claims;
  const sessionToken = signSession({ sub: uid, email, role });

  const response = envelope({ uid, email, role }, 200, 'Sesión renovada');

  const cookieAttributes = [
    `__session=${sessionToken}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${env.SESSION_TTL}`,
  ].join('; ');

  response.headers.set('Set-Cookie', cookieAttributes);
  response.headers.set('Cache-Control', 'no-store');

  return response;
});
