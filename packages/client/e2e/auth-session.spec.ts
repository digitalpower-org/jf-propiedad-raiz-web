/**
 * MT1.2 / AC1.4.1 / AC1.5.1 — evidencia end-to-end de sesión y guard de admin.
 *
 * Requiere los emuladores de Firebase (auth 9099, firestore 8080, functions
 * 5001), el seed de administradores y el cliente compilado escuchando en
 * `http://localhost:3001`. Ver `docs/EMULATORS.md` §E2E.
 *
 * Comando exacto:
 *   npm run seed:admins
 *   PORT=3001 npm run start -w @jf/client
 *   npm run test:e2e:auth -w @jf/client
 */
import { test, expect, type APIRequestContext, type APIResponse } from '@playwright/test';

import { mintIdToken } from './helpers/auth';

const ADMIN_EMAIL = 'admin@test.local';
const ADMIN_PASSWORD = 'password123';
const UNSEEDED_EMAIL = `e2e-unseeded-${Date.now()}@test.local`;

interface SessionSuccessBody {
  success: boolean;
  data: {
    uid: string;
    email: string;
    role: string;
  };
}

interface SessionErrorBody {
  success: boolean;
  data: {
    code: string;
  };
}

async function createAdminSession(
  request: APIRequestContext,
): Promise<{ response: APIResponse; setCookie: string | undefined; cookie: string | null }> {
  const idToken = await mintIdToken(ADMIN_EMAIL, ADMIN_PASSWORD);
  const response = await request.post('/api/auth/session', {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const setCookie = response.headers()['set-cookie'];
  const cookie = setCookie?.split(';')[0] ?? null;
  return { response, setCookie, cookie };
}

test.describe('Auth session end-to-end (MT1.2)', () => {
  test.skip(
    process.env.E2E_AUTH !== '1',
    'Requires Firebase emulators + seeded Firestore: see docs/EMULATORS.md §E2E',
  );

  test('seeded admin idToken → POST /api/auth/session returns 200 + __session cookie', async ({
    request,
  }) => {
    const { response, setCookie } = await createAdminSession(request);

    expect(response.status()).toBe(200);

    const body = (await response.json()) as SessionSuccessBody;
    expect(body.success).toBe(true);
    expect(body.data.email).toBe(ADMIN_EMAIL);
    expect(body.data.role).toBe('admin');

    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('__session=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=Strict');
    expect(setCookie).toContain('Path=/');
  });

  test('unseeded email → POST /api/auth/session returns 403 PERMISSION_DENIED without cookie', async ({
    request,
  }) => {
    const idToken = await mintIdToken(UNSEEDED_EMAIL, ADMIN_PASSWORD);
    const response = await request.post('/api/auth/session', {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    expect(response.status()).toBe(403);
    expect(response.headers()['set-cookie']).toBeUndefined();

    const body = (await response.json()) as SessionErrorBody;
    expect(body.success).toBe(false);
    expect(body.data.code).toBe('PERMISSION_DENIED');
  });

  test('GET /es/admin without cookie redirects to /es/admin/login', async ({ request }) => {
    const response = await request.get('/es/admin', { maxRedirects: 0 });

    expect([301, 302, 303, 307, 308]).toContain(response.status());
    expect(response.headers()['location']).toContain('/es/admin/login');

    const body = await response.text();
    expect(body).not.toContain('Panel de Administración');
  });

  test('GET /es/admin with a valid __session cookie returns 200 admin HTML', async ({
    request,
  }) => {
    const { cookie } = await createAdminSession(request);
    expect(cookie).toBeTruthy();

    const response = await request.get('/es/admin', {
      headers: { Cookie: cookie ?? '' },
    });

    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('Panel de Administración');
  });

  test('GET /es/admin/login without cookie returns 200', async ({ request }) => {
    const response = await request.get('/es/admin/login');
    expect(response.status()).toBe(200);
  });
});
