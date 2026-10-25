/**
 * `/` sin prefijo de idioma → `/es` o `/en` según `Accept-Language` (AC0.4.2),
 * con español por defecto.
 *
 * Se resuelve en un route handler y no en el proxy: `src/proxy.ts` está
 * reservado por D32 para cerrar la superficie de `/api` (404/405) y no debe
 * mezclarse con el enrutado de idioma.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { negotiateLocale } from '@/i18n/negotiate';

export function GET(request: NextRequest): NextResponse {
  const locale = negotiateLocale(request.headers.get('accept-language'));
  const target = new URL(`/${locale}`, request.url);
  target.search = request.nextUrl.search;

  // 307: preserva el método y es temporal (el idioma depende del navegador).
  return NextResponse.redirect(target, 307);
}
