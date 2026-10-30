/**
 * AC1.3.8 — La verificación de sesión nunca debe lanzar: una cookie con firma
 * de longitud distinta a la esperada se rechaza como inválida (401), no como 500.
 *
 * Ejecutar: npm run test -w @jf/client
 */

import crypto from 'crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';

// server-only lanza al importarse fuera de un Server Component de Next.js.
vi.mock('server-only', () => ({ default: undefined }));

const CURRENT_SECRET = 'test-secret-with-at-least-32-chars!!!';
const PREVIOUS_SECRET = 'previous-secret-with-at-least-32-chars';
const OTHER_SECRET = 'other-secret-with-at-least-32-chars!!!';

beforeAll(() => {
  process.env.BFF_INTERNAL_KEY = 'test-key-with-at-least-32-chars!!!';
  process.env.SESSION_JWT_SECRET = CURRENT_SECRET;
  process.env.SESSION_JWT_SECRET_PREVIOUS = PREVIOUS_SECRET;
  process.env.SESSION_TTL = '3900';
  process.env.SESSION_SKEW = '60';
});

async function importJwt() {
  vi.resetModules();
  return await import('./jwt');
}

function makeToken(secret: string, overrides: Record<string, unknown> = {}): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      sub: 'uid-123',
      email: 'admin@test.local',
      role: 'admin',
      iss: 'jf-bff',
      aud: 'jf-web',
      iat: now,
      exp: now + 3900,
      ...overrides,
    }),
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(header + '.' + body)
    .digest('base64url');
  return header + '.' + body + '.' + signature;
}

describe('verifySession — firma (AC1.3.8)', () => {
  it('acepta un token firmado con el secreto vigente', async () => {
    const jwt = await importJwt();
    const claims = jwt.verifySession(
      jwt.signSession({ sub: 'uid-123', email: 'admin@test.local', role: 'admin' }),
    );

    expect(claims).not.toBeNull();
    expect(claims?.sub).toBe('uid-123');
  });

  it('rechaza una firma truncada sin lanzar', async () => {
    const jwt = await importJwt();
    const truncated = jwt.signSession({ sub: 'u', email: 'a@b.co', role: 'admin' }).slice(0, -1);

    expect(() => jwt.verifySession(truncated)).not.toThrow();
    expect(jwt.verifySession(truncated)).toBeNull();
  });

  it('rechaza una firma sobredimensionada sin lanzar', async () => {
    const jwt = await importJwt();
    const oversized =
      jwt.signSession({ sub: 'u', email: 'a@b.co', role: 'admin' }) + 'AAAAAAAAAAAA';

    expect(() => jwt.verifySession(oversized)).not.toThrow();
    expect(jwt.verifySession(oversized)).toBeNull();
  });

  it('rechaza una firma manipulada de la misma longitud', async () => {
    const jwt = await importJwt();
    const token = jwt.signSession({ sub: 'u', email: 'a@b.co', role: 'admin' });
    const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');

    expect(jwt.verifySession(tampered)).toBeNull();
  });

  it('rechaza un token firmado con otro secreto', async () => {
    const jwt = await importJwt();

    expect(jwt.verifySession(makeToken(OTHER_SECRET))).toBeNull();
  });

  it('acepta un token firmado con el secreto anterior durante la rotación', async () => {
    const jwt = await importJwt();

    const claims = jwt.verifySession(makeToken(PREVIOUS_SECRET));

    expect(claims).not.toBeNull();
    expect(claims?.email).toBe('admin@test.local');
  });

  it('rechaza sin lanzar una firma truncada del secreto anterior', async () => {
    const jwt = await importJwt();
    const truncated = makeToken(PREVIOUS_SECRET).slice(0, -1);

    expect(() => jwt.verifySession(truncated)).not.toThrow();
    expect(jwt.verifySession(truncated)).toBeNull();
  });
});
