// POST /api/auth/session — canje de idToken de Firebase por JWT propio del BFF.
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
  return await import('./route');
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
  // @ts-expect-error - NextRequest espera un RequestInit estricto, pero el objeto
  // cumple con lo necesario para pruebas.
  return new NextRequest(`http://localhost:3001${pathname}`, reqInit);
}

describe('POST /api/auth/session — canje de sesión', () => {
  it('devuelve 200 + Set-Cookie __session para idToken autorizado (admin@test.local)', async () => {
    const { POST } = await load();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { uid: 'uid-1', email: 'admin@test.local', role: 'admin' },
          message: 'Autenticación exitosa',
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      request('/api/auth/session', {
        method: 'POST',
        headers: { authorization: 'Bearer fake-id-token', 'content-type': 'application/json' },
      }),
      undefined,
    );

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe('admin@test.local');
    expect(body.data.role).toBe('admin');

    const cookie = response.headers.get('set-cookie');
    expect(cookie).toContain('__session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Max-Age=');
    expect(response.headers.get('cache-control')).toBe('no-store');

    // 3.1: llamó a functionsBaseUrl, no a request.url
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe('https://functions.test/internal/auth/verify');
    const headers = new Headers(call?.[1]?.headers);
    expect(headers.get('x-internal-key')).toBe(INTERNAL_KEY);
    expect(headers.get('content-type')).toBe('application/json');
    // No reenvía cookie ni authorization del cliente (AC1.3.5)
    expect(headers.get('cookie')).toBeNull();
    expect(headers.get('authorization')).toBeNull();
  });

  it('email no sembrado → 403 (PERMISSION_DENIED)', async () => {
    const { POST } = await load();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          data: { code: 'PERMISSION_DENIED', details: [], requestId: 'req-1' },
          message: 'Usuario no autorizado o inactivo',
        }),
        { status: 403 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      request('/api/auth/session', {
        method: 'POST',
        headers: { authorization: 'Bearer fake-id-token' },
      }),
      undefined,
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.data.code).toBe('PERMISSION_DENIED');
  });

  it('idToken inválido → 401 propagado del backend', async () => {
    const { POST } = await load();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          data: { code: 'UNAUTHORIZED', details: [], requestId: 'req-2' },
          message: 'Token inválido o expirado',
        }),
        { status: 401 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(
      request('/api/auth/session', {
        method: 'POST',
        headers: { authorization: 'Bearer fake-id-token' },
      }),
      undefined,
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.data.code).toBe('UNAUTHORIZED');
  });

  it('sin Authorization header → 401 sin llamar al backend', async () => {
    const { POST } = await load();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(request('/api/auth/session', { method: 'POST' }), undefined);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.data.code).toBe('UNAUTHORIZED');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
