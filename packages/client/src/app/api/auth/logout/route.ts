/**
 * MT1.1 PLENUM ESTRUCTURAL — endpoint `POST /api/auth/logout`.
 *
 * MT1.2: borrar la cookie `__session` y responder 204 sin cuerpo (AC1.4.1).
 *
 * MT1.1: retorna status 204 vacío. Ninguna lógica de sesión.
 */

import { type NextRequest, NextResponse } from 'next/server';

export const POST = (request: NextRequest): NextResponse => {
  return new NextResponse(null, { status: 204 });
};
