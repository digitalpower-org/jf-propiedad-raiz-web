/**
 * BFF — envoltorio único de los route handlers (D32, US1.3).
 *
 * `bffRoute()` aplica la política del catálogo `routes.ts` antes de la lógica
 * del handler: `public` no lee la cookie, `session` exige una cookie `__session`
 * verificada y `internal` exige `X-Internal-Key`. La identidad reenviada se
 * construye solo desde el JWT verificado (AC1.3.2, AC1.3.5): nunca se copian
 * `X-User-*`, `cookie` ni `authorization` de la petición entrante.
 */

import { type NextRequest, NextResponse } from 'next/server';
import type { ErrorCode } from '@jf/shared-types';

import { env, functionsBaseUrl } from '@/server/config/server-config';
import { matchRoute } from '@/server/match-route';
import type { BffRoute } from '@/server/routes';
import { extractSessionFromCookie, type SessionClaims } from '@/server/session/jwt';

export interface BffContext {
  readonly route: BffRoute;
  readonly internalKey: string;
  readonly claims: SessionClaims | null;
}

export function envelope<T>(data: T, status = 200, message = 'OK'): NextResponse {
  return NextResponse.json({ success: true, data, message }, { status });
}

export function errorEnvelope(
  code: ErrorCode,
  message: string,
  status: number,
  details: readonly string[] = [],
  headers?: Record<string, string>,
): NextResponse {
  const requestId = crypto.randomUUID();
  console.warn(`[BFF_ERROR] ${status} ${code} requestId=${requestId}`);

  const init: ResponseInit = { status };
  if (headers) init.headers = headers;

  return NextResponse.json({ success: false, data: { code, details, requestId }, message }, init);
}

export function bffRoute<Ctx = unknown>(
  handler: (request: NextRequest, ctx: BffContext, routeCtx: Ctx) => Promise<NextResponse>,
): (request: NextRequest, routeCtx: Ctx) => Promise<NextResponse> {
  return async (request, routeCtx) => {
    const match = matchRoute(request.method, request.nextUrl.pathname);

    if (match.kind === 'not-found') {
      return errorEnvelope('NOT_FOUND', 'La ruta solicitada no existe.', 404);
    }

    if (match.kind === 'method-not-allowed') {
      return errorEnvelope(
        'METHOD_NOT_ALLOWED',
        'El método no está permitido en esta ruta.',
        405,
        [],
        { Allow: match.allow.join(', ') },
      );
    }

    let claims: SessionClaims | null = null;

    if (match.route.auth === 'session') {
      claims = await extractSessionFromCookie(request);
      if (!claims) {
        return errorEnvelope('UNAUTHORIZED', 'Sesión inválida o ausente.', 401);
      }
    }

    if (match.route.auth === 'internal') {
      const incomingKey = request.headers.get('x-internal-key');
      if (!incomingKey || incomingKey !== env.BFF_INTERNAL_KEY) {
        return errorEnvelope('UNAUTHORIZED', 'Clave interna inválida o ausente.', 401);
      }
    }

    const response = await handler(
      request,
      { route: match.route, internalKey: env.BFF_INTERNAL_KEY, claims },
      routeCtx,
    );

    if (match.route.auth === 'session') {
      response.headers.set('Cache-Control', 'no-store');
    }

    return response;
  };
}

export async function delegateToBackend(
  request: NextRequest,
  ctx: BffContext,
  params: Readonly<Record<string, string>> = {},
): Promise<NextResponse> {
  const internalPath = ctx.route.internalPath;
  if (!internalPath) {
    return errorEnvelope('NOT_FOUND', 'La ruta se resuelve en el BFF.', 404);
  }

  const path = internalPath.replace(/\{(\w+)\}/g, (_segment, name: string) =>
    encodeURIComponent(params[name] ?? ''),
  );
  const url = `${functionsBaseUrl.replace(/\/+$/, '')}${path}`;

  const headers = new Headers({ 'X-Internal-Key': ctx.internalKey });
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);

  if (ctx.claims) {
    headers.set('X-User-Id', ctx.claims.sub);
    headers.set('X-User-Email', ctx.claims.email);
    headers.set('X-User-Role', ctx.claims.role);
  }

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(url, init);

  if (upstream.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const text = await upstream.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return errorEnvelope('INTERNAL', 'Respuesta inválida del backend.', 502);
  }

  const response = NextResponse.json(payload, { status: upstream.status });
  const retryAfter = upstream.headers.get('retry-after');
  if (retryAfter) response.headers.set('Retry-After', retryAfter);
  return response;
}
