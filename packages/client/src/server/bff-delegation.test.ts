/**
 * MT1.1 — BFF y seguridad interna (AC1.3.1, AC1.3.2, AC1.3.5, AC1.3.6).
 *
 * Verifica que:
 * 1. Toda ruta con internalPath reenvía a functionsBaseUrl con X-Internal-Key
 *    correcto y sin reenviar cookie/authorization del cliente (AC1.3.2, AC1.3.5).
 * 2. Toda ruta con auth: 'session' responde 401 sin llamar al backend cuando
 *    no hay cookie válida (AC1.3.1).
 * 3. Toda ruta con auth: 'internal' exige X-Internal-Key válida (AC1.3.6).
 */

import { NextRequest, NextResponse } from 'next/server';
import { afterEach, beforeAll, beforeEach, describe, expect, it, test, vi } from 'vitest';

import { ROUTES } from './routes';

vi.mock('server-only', () => ({ default: undefined }));

const INTERNAL_KEY = 'test-key-with-at-least-32-chars!!!';
const SECRET = 'test-secret-with-at-least-32-chars!!!';

beforeAll(() => {
  process.env.BFF_INTERNAL_KEY = INTERNAL_KEY;
  process.env.SESSION_JWT_SECRET = SECRET;
  process.env.SESSION_JWT_SECRET_PREVIOUS = '';
  process.env.SESSION_TTL = '3900';
  process.env.SESSION_SKEW = '60';
  process.env.FUNCTIONS_BASE_URL = 'https://functions.test';
});

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function load() {
  vi.resetModules();
  const { bffRoute } = await import('./bff-helper');
  const { signSession } = await import('./session/jwt');
  const { delegateToBackend } = await import('./bff-helper');
  return { bffRoute, delegateToBackend, jwt: { signSession } };
}

function request(
  pathname: string,
  init: { method?: string; headers?: Record<string, string>; body?: string } = {},
): NextRequest {
  const reqInit: RequestInit = {
    method: init.method ?? 'GET',
    headers: init.headers ?? {},
  };
  if (init.body !== undefined) {
    reqInit.body = init.body;
  }
  // @ts-expect-error - NextRequest espera un RequestInit estricto.
  return new NextRequest(`http://localhost:3001${pathname}`, reqInit);
}

function upstreamFactory() {
  return () =>
    new Response(JSON.stringify({ success: true, data: null, message: 'ok' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
}

function validCookie(jwtModule: {
  signSession: (claims: { sub: string; email: string; role: string }) => string;
}): string {
  const token = jwtModule.signSession({ sub: 'uid-1', email: 'admin@test.local', role: 'admin' });
  return `__session=${token}`;
}

const delegableRoutes = ROUTES.filter((route) => route.internalPath !== null);

describe('MT1.1 — delegateToBackend con rutas internalPath', () => {
  test.each(delegableRoutes)(
    'delega $path al backend con X-Internal-Key y sin reenviar cookie/authorization',
    async (route: (typeof ROUTES)[number]) => {
      const { bffRoute, delegateToBackend, jwt } = await load();
      const fetchMock = vi.fn().mockImplementation(upstreamFactory());
      vi.stubGlobal('fetch', fetchMock);

      const handler = bffRoute((req, ctx) => delegateToBackend(req, ctx));
      const cookieValue = validCookie(jwt);

      await handler(
        request(route.path, {
          method: route.method,
          headers: {
            cookie: cookieValue,
            authorization: 'Bearer forged-id-token',
            'x-user-id': 'attacker',
          },
        }),
        {},
      );

      const call = fetchMock.mock.calls[0];
      expect(call).toBeDefined();
      expect(String(call?.[0])).toContain((route.internalPath ?? '').replace('{idOrSlug}', ''));

      const headers = new Headers(call?.[1]?.headers);
      expect(headers.get('x-internal-key')).toBe(INTERNAL_KEY);
      expect(headers.get('cookie')).toBeNull();
      expect(headers.get('authorization')).toBeNull();
    },
  );
});

describe('MT1.1 — Guard de sesión (401 sin llamar al backend)', () => {
  it(`rechaza las rutas session con 401 sin llamar al backend (AC1.3.1)`, async () => {
    const { bffRoute, delegateToBackend } = await load();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const sessionRoutes = ROUTES.filter((route) => route.auth === 'session');

    for (const route of sessionRoutes) {
      const handler = bffRoute((req, ctx) => delegateToBackend(req, ctx));
      const response = await handler(request(route.path, { method: route.method }), {});

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.data.code).toBe('UNAUTHORIZED');
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('MT1.1 — Política internal (AC1.3.6)', () => {
  it(`exige X-Internal-Key en rutas internal`, async () => {
    const { bffRoute } = await load();

    const internalRoutes = ROUTES.filter((route) => route.auth === 'internal');

    for (const route of internalRoutes) {
      const handler = bffRoute(async (_req, _ctx) => {
        return new NextResponse(JSON.stringify({ ok: true }), { status: 200 });
      });

      // Sin X-Internal-Key → 401
      const response = await handler(request(route.path, { method: route.method }), {});
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.data.code).toBe('UNAUTHORIZED');

      // Con X-Internal-Key válida → ejecuta handler (200)
      const responseOk = await handler(
        request(route.path, {
          method: route.method,
          headers: { 'x-internal-key': INTERNAL_KEY },
        }),
        {},
      );
      expect(responseOk.status).toBe(200);
    }
  });
});
