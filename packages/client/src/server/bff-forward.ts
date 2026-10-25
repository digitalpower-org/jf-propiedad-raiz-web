/**
 * Helper de forwarding BFF → Functions (MT1.2).
 *
 * MT1.2: validación real de la cookie `__session` (JWT HS256 + claims D34) y
 * propagación de identidad mediante cabeceras X-User-* con la sesión verificada
 * (AC1.3.2, AC1.3.5).
 */

import { type NextRequest, NextResponse } from 'next/server';

import { getInternalKey } from './bff-helper';
import { extractSessionFromCookie } from './session/jwt';

export interface ForwardContext {
  readonly internalKey: string;
  readonly userId?: string;
  readonly userEmail?: string;
  readonly userRole?: string;
}

function forwardHeaders(ctx: ForwardContext): Headers {
  const headers = new Headers();
  headers.set('X-Internal-Key', ctx.internalKey);
  if (ctx.userId) headers.set('X-User-Id', ctx.userId);
  if (ctx.userEmail) headers.set('X-User-Email', ctx.userEmail);
  if (ctx.userRole) headers.set('X-User-Role', ctx.userRole);

  return headers;
}

export function respondWithEnvelope<T>(body: T, status: number): NextResponse {
  // Envolvente AC0.1.1 (éxito) / AC0.1.2 (error) — misma que el backend.
  return NextResponse.json({ success: true, data: body, error: null }, { status });
}

export async function forwardToInternal(
  request: NextRequest,
  internalPath: string,
  internalKeyOverride?: string,
  session?: Awaited<ReturnType<typeof extractSessionFromCookie>>,
): Promise<NextResponse> {
  // Validar sesión si no se pasa ya (para middleware)
  const claims = session ?? (await extractSessionFromCookie(request));

  if (!claims) {
    // No autenticado → no propagar
    return NextResponse.json(
      {
        success: false,
        data: { code: 'UNAUTHORIZED', details: [], requestId: crypto.randomUUID() },
        message: 'No autenticado',
      },
      { status: 401 },
    );
  }

  const ctx: ForwardContext = {
    internalKey: internalKeyOverride ?? getInternalKey(),
    userId: claims.sub,
    userEmail: claims.email,
    userRole: claims.role,
  };

  const headers = forwardHeaders(ctx);

  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);
  const authorization = request.headers.get('authorization');
  if (authorization) headers.set('authorization', authorization);

  const url = new URL(internalPath, request.url);
  const init: RequestInit = { method: request.method, headers };
  if (!(request.method === 'GET' || request.method === 'HEAD')) {
    init.body = await request.clone().arrayBuffer();
  }

  const upstream = await fetch(url, init);

  const text = await upstream.text();
  let bodyResponse: unknown = null;
  try {
    bodyResponse = JSON.parse(text);
  } catch {
    bodyResponse = { success: true, data: null, error: null };
  }

  const status = upstream.status;
  const response = NextResponse.json(bodyResponse, { status });
  const retryAfter = upstream.headers.get('retry-after');
  if (retryAfter) response.headers.set('Retry-After', retryAfter);
  return response;
}