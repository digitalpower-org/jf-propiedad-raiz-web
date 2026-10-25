/**
 * Cierre de la superficie pública del BFF (AC0.1.6, D31/D32).
 *
 * El Proxy decide solo si la petición existe en el catálogo y si el método
 * está permitido; **no autentica** (eso ocurre en cada route handler, D32).
 * Sin este cierre, Next respondería con su propio 404 en HTML o con un 405 de
 * cuerpo vacío.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { matchRoute } from '@/server/match-route';

function errorResponse(
  status: number,
  code: 'NOT_FOUND' | 'METHOD_NOT_ALLOWED',
  message: string,
  headers: Record<string, string> = {},
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      data: { code, details: [], requestId: crypto.randomUUID() },
      message,
    },
    { status, headers },
  );
}

export function proxy(request: NextRequest): NextResponse {
  const match = matchRoute(request.method, request.nextUrl.pathname);

  if (match.kind === 'not-found') {
    return errorResponse(404, 'NOT_FOUND', 'La ruta solicitada no existe.');
  }

  if (match.kind === 'method-not-allowed') {
    return errorResponse(405, 'METHOD_NOT_ALLOWED', 'El método no está permitido en esta ruta.', {
      Allow: match.allow.join(', '),
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
