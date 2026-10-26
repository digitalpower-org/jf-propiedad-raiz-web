/**
 * MT1.1 — Helper común para route handlers del BFF (plenum estructural).
 *
 * Este módulo centraliza la lógica de:
 * - Extraer headers `X-Internal-Key` y `X-User-*` (placeholder hasta MT1.2).
 * - Responder con envoltura estándar AC0.1.1/AC0.1.2.
 * - Delegar al backend interno (Functions) cuando `internalPath !== null`.
 *
 * MT1.2 reemplazará la extracción de headers por validación real de cookie
 * `__session` (JWT HS256 + claims). Mientras tanto, este helper solo
 * provee el esqueleto estructural que hace que las rutas existan y pasen
 * la validación del contrato OpenAPI.
 */

import { type NextRequest, NextResponse } from 'next/server';

export interface BffContext {
  readonly internalKey: string;
  readonly userId: string | undefined;
  readonly userEmail: string | undefined;
  readonly userRole: string | undefined;
}

export function getInternalKey(): string {
  // MT1.1: placeholder. MT1.2: usar secret de entorno (Secret Manager).
  const key = process.env.BFF_INTERNAL_KEY;
  if (!key) {
    throw new Error('BFF_INTERNAL_KEY no está configurada');
  }
  return key;
}

export function buildContext(request: NextRequest): BffContext {
  // MT1.1: headers vacíos. MT1.2: parsear cookie `__session` → claims → headers.
  const userId = request.headers.get('x-user-id') ?? null;
  const userEmail = request.headers.get('x-user-email') ?? null;
  const userRole = request.headers.get('x-user-role') ?? null;

  // Si se proporciona X-User-* desde el BFF, preferirlo.
  // El BFF sobrescribe los headers con el JWT verificado (AC1.3.5).
  return {
    internalKey: getInternalKey(),
    userId: userId ?? undefined,
    userEmail: userEmail ?? undefined,
    userRole: userRole ?? undefined,
  };
}

export function envelope<T>(body: T, status = 200): NextResponse {
  // Envoltura AC0.1.1 (éxito) / AC0.1.2 (error) — misma que el backend.
  return NextResponse.json({ success: status < 400, data: body, error: null }, { status });
}

export function errorEnvelope(code: string, message: string, status: number): NextResponse {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: { code, message, details: [], requestId: crypto.randomUUID() },
    },
    { status },
  );
}

export async function delegateToBackend(
  request: NextRequest,
  internalPath: string,
  ctx: BffContext,
): Promise<NextResponse> {
  // MT1.1: placeholder. MT1.2: fetch real a Functions con headers validados.
  const url = new URL(internalPath, request.url);
  const headers = new Headers();
  headers.set('X-Internal-Key', ctx.internalKey);
  if (ctx.userId) headers.set('X-User-Id', ctx.userId);
  if (ctx.userEmail) headers.set('X-User-Email', ctx.userEmail);
  if (ctx.userRole) headers.set('X-User-Role', ctx.userRole);

  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);
  const authorization = request.headers.get('authorization');
  if (authorization) headers.set('authorization', authorization);

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

  const response = NextResponse.json(bodyResponse, { status: upstream.status });
  const retryAfter = upstream.headers.get('retry-after');
  if (retryAfter) response.headers.set('Retry-After', retryAfter);
  return response;
}
