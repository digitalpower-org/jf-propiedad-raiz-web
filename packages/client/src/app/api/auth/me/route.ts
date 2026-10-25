// GET /api/auth/me
// MT1.2: validar JWT de sesión y devolver identidad.
// Si la cookie __session es válida, responde con { uid, email, role }.
// Si no hay cookie o es inválida, responde 401.

import { type NextRequest, NextResponse } from 'next/server';

import { envelope } from '@/server/bff-helper';
import { extractSessionFromCookie } from '@/server/session/jwt';

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  // MT1.2: validar la cookie __session usando extractSessionFromCookie
  const sessionClaims = await extractSessionFromCookie(request);

  if (!sessionClaims) {
    return envelope({ user: null, authenticated: false }, 401);
  }

  // Cookie válida: devolver identidad { uid, email, role }
  const { sub: uid, email, role } = sessionClaims;
  return envelope({ user: { uid, email, role }, authenticated: true });
};