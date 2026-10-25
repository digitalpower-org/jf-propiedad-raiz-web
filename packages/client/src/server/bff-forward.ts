/**
 * Helper de forwarding BFF → Functions (MT1.1 plenum estructural).
 *
 * MT1.1: expone el contrato interno con headers placeholder
 * (`X-Internal-Key` + `X-User-*`) que MT1.2 poblará con la validación real
 * (cookie `__session` + claims). Mientras tanto, este helper solo serializa
 * la respuesta del backend sin transformarla.
 */

import { type NextRequest, NextResponse } from 'next/server';

export interface ForwardContext {
  readonly internalKey: string;
  readonly userId?: string;
  readonly userEmail?: string;
  readonly userRole?: string;
}

function forwardHeaders(request: NextRequest, ctx: ForwardContext): Headers {
  const headers = new Headers();
  headers.set('X-Internal-Key', ctx.internalKey);
  if (ctx.userId) headers.set('X-User-Id', ctx.userId);
  if (ctx.userEmail) headers.set('X-User-Email', ctx.userEmail);
  if (ctx.userRole) headers.set('X-User-Role', ctx.userRole);

  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);
  const authorization = request.headers.get('authorization');
  if (authorization) headers.set('authorization', authorization);

  return headers;
}

export function respondWithEnvelope<T>(body: T, status: number): NextResponse {
  // Envolvente AC0.1.1 (éxito) / AC0.1.2 (error) — misma que el backend.
  // TODO(MT1.1): usar catálogo de ErrorCode real desde shared-types.
  return NextResponse.json({ success: true, data: body, error: null }, { status });
}

export async function forwardToInternal(
  request: NextRequest,
  internalPath: string,
  ctx: ForwardContext,
): Promise<NextResponse> {
  const url = new URL(internalPath, request.url);
  const headers = forwardHeaders(request, ctx);

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
