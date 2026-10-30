/**
 * US1.3 — Envoltorio del BFF: política de sesión y propagación de identidad.
 *
 * Cubre AC1.3.1 (401 sin llamar al backend), AC1.3.2/AC1.3.5 (identidad solo
 * desde el JWT verificado, sin confiar en `X-User-*`, `cookie` ni
 * `authorization` del cliente), AC1.3.6 (X-Internal-Key) y AC1.3.7 (no-store).
 */

import { NextRequest } from 'next/server';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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
  const helper = await import('./bff-helper');
  const jwt = await import('./session/jwt');
  return { helper, jwt };
}

type RequestInitLike = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

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
  // @ts-expect-error - NextRequest espera un RequestInit estricto,
  // pero el objeto cumple con lo necesario para pruebas.
  return new NextRequest(`http://localhost:3001${pathname}`, reqInit);
}

function upstream(payload: unknown = { success: true, data: null, message: 'ok' }, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function validCookie(jwt: {
  signSession: (claims: { sub: string; email: string; role: string }) => string;
}): string {
  const token = jwt.signSession({ sub: 'uid-1', email: 'admin@test.local', role: 'admin' });
  return `__session=${token}`;
}

function forwardedHeaders(fetchMock: ReturnType<typeof vi.fn>): Headers {
  const call = fetchMock.mock.calls[0];
  if (!call) throw new Error('No se llamó al backend');
  return new Headers(call[1]?.headers);
}

describe('bffRoute — política de sesión', () => {
  it('sin cookie responde 401 con la envoltura de error y no llama al backend (AC1.3.1, AC0.1.2)', async () => {
    const { helper } = await load();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const handler = helper.bffRoute((req, ctx) => helper.delegateToBackend(req, ctx));
    const response = await handler(request('/api/properties', { method: 'POST', body: '{}' }), {});
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.data.code).toBe('UNAUTHORIZED');
    expect(body.data.details).toEqual([]);
    expect(typeof body.data.requestId).toBe('string');
    expect(typeof body.message).toBe('string');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza una cookie malformada sin llamar al backend', async () => {
    const { helper } = await load();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const handler = helper.bffRoute((req, ctx) => helper.delegateToBackend(req, ctx));
    const response = await handler(
      request('/api/properties', {
        method: 'POST',
        headers: { cookie: '__session=basura' },
        body: '{}',
      }),
      {},
    );

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('propaga la identidad del JWT y descarta X-User-*, cookie y authorization del cliente (AC1.3.2, AC1.3.5)', async () => {
    const { helper, jwt } = await load();
    const fetchMock = vi.fn().mockResolvedValue(upstream());
    vi.stubGlobal('fetch', fetchMock);

    const handler = helper.bffRoute((req, ctx) => helper.delegateToBackend(req, ctx));
    const response = await handler(
      request('/api/properties', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: validCookie(jwt),
          authorization: 'Bearer forged-id-token',
          'x-user-id': 'attacker',
          'x-user-email': 'attacker@evil.test',
          'x-user-role': 'admin',
          'x-internal-key': 'forged-key-with-at-least-32-chars',
        },
        body: '{"title":"Casa"}',
      }),
      {},
    );

    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe('https://functions.test/api/v1/properties');

    const headers = forwardedHeaders(fetchMock);
    expect(headers.get('x-internal-key')).toBe(INTERNAL_KEY);
    expect(headers.get('x-user-id')).toBe('uid-1');
    expect(headers.get('x-user-email')).toBe('admin@test.local');
    expect(headers.get('x-user-role')).toBe('admin');
    expect(headers.get('cookie')).toBeNull();
    expect(headers.get('authorization')).toBeNull();
    expect(headers.get('content-type')).toBe('application/json');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('una ruta public no lee la cookie ni propaga identidad ni no-store (AC1.3.7)', async () => {
    const { helper, jwt } = await load();
    const fetchMock = vi.fn().mockResolvedValue(upstream());
    vi.stubGlobal('fetch', fetchMock);

    const handler = helper.bffRoute((req, ctx) => helper.delegateToBackend(req, ctx));
    const response = await handler(
      request('/api/properties', {
        headers: {
          cookie: validCookie(jwt),
          'x-user-id': 'attacker',
          'x-user-role': 'admin',
        },
      }),
      {},
    );

    const headers = forwardedHeaders(fetchMock);
    expect(headers.get('x-user-id')).toBeNull();
    expect(headers.get('x-user-email')).toBeNull();
    expect(headers.get('x-user-role')).toBeNull();
    expect(response.headers.get('cache-control')).toBeNull();
  });

  it('sustituye y codifica el segmento dinámico del catálogo', async () => {
    const { helper } = await load();
    const fetchMock = vi.fn().mockResolvedValue(upstream());
    vi.stubGlobal('fetch', fetchMock);

    const handler = helper.bffRoute(
      async (req, ctx, { params }: { params: Promise<{ idOrSlug: string }> }) => {
        const { idOrSlug } = await params;
        return helper.delegateToBackend(req, ctx, { idOrSlug });
      },
    );
    await handler(request('/api/properties/casa-arboleda'), {
      params: Promise.resolve({ idOrSlug: 'casa arbórea' }),
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://functions.test/api/v1/properties/casa%20arb%C3%B3rea',
    );
  });

  it('propaga el 204 del backend sin cuerpo', async () => {
    const { helper, jwt } = await load();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    const handler = helper.bffRoute((req, ctx) => helper.delegateToBackend(req, ctx));
    const response = await handler(
      request('/api/properties/casa-1', {
        method: 'DELETE',
        headers: { cookie: validCookie(jwt) },
      }),
      {},
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });
});

describe('bffRoute — política internal (AC1.3.6)', () => {
  it('sin X-Internal-Key responde 401 antes de ejecutar el handler', async () => {
    const { helper } = await load();
    const inner = vi.fn().mockResolvedValue(helper.envelope({ ok: true }));

    const handler = helper.bffRoute(inner);
    const response = await handler(request('/api/revalidate', { method: 'POST', body: '{}' }), {});

    expect(response.status).toBe(401);
    expect(inner).not.toHaveBeenCalled();
  });

  it('con X-Internal-Key válida ejecuta el handler', async () => {
    const { helper } = await load();
    const inner = vi.fn().mockResolvedValue(helper.envelope({ ok: true }));

    const handler = helper.bffRoute(inner);
    const response = await handler(
      request('/api/revalidate', {
        method: 'POST',
        headers: { 'x-internal-key': INTERNAL_KEY },
        body: '{}',
      }),
      {},
    );

    expect(response.status).toBe(200);
    expect(inner).toHaveBeenCalledTimes(1);
  });
});
