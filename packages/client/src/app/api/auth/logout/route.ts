/**
 * MT1.1 PLENUM ESTRUCTURAL — endpoint `POST /api/auth/logout`.
 *
 * MT1.2 / AC1.4.1: borra la cookie `__session` del BFF y responde 204 sin
 * cuerpo. Los atributos de borrado repiten los de emisión (Path, HttpOnly,
 * Secure, SameSite) para que el navegador elimine exactamente la misma cookie.
 */

import { NextResponse } from 'next/server';

export const POST = (): NextResponse => {
  const response = new NextResponse(null, { status: 204 });

  const cookieAttributes = [
    '__session=',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/',
  ].join('; ');

  response.headers.set('Set-Cookie', cookieAttributes);
  response.headers.set('Cache-Control', 'no-store');

  return response;
};
