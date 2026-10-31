import { describe, it, expect, vi, beforeAll } from 'vitest';
import { internalAuth } from './internal-auth';
import { findAuthorizedUser } from '../../infrastructure/auth/authorized-users';

vi.mock('../../infrastructure/firebase/admin', () => ({ getAdminApp: vi.fn() }));
vi.mock('../../infrastructure/auth/authorized-users', () => ({ findAuthorizedUser: vi.fn() }));

// Factory crea verifyIdToken una vez; getAuth() devuelve el mismo objeto compartido con internal-auth.ts
vi.mock('firebase-admin/auth', () => {
  const verifyIdToken = vi.fn();
  return {
    getAuth: vi.fn(() => ({ verifyIdToken })),
  };
});

import { getAuth } from 'firebase-admin/auth';

const { verifyIdToken } = getAuth() as unknown as { verifyIdToken: ReturnType<typeof vi.fn> };
const findAuthorizedUserMock = findAuthorizedUser as ReturnType<typeof vi.fn>;

beforeAll(() => {
  process.env.BFF_INTERNAL_KEY = 'test-key-with-at-least-32-chars!!!';
});

interface MockRequest {
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

interface MockResponse {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
}

beforeAll(() => {
  process.env.BFF_INTERNAL_KEY = 'test-key-with-at-least-32-chars!!!';
});

function request(
  method: string,
  headers: Record<string, string>,
  body: unknown,
): { req: MockRequest; res: MockResponse } {
  const req: MockRequest = {
    method,
    headers: { ...headers },
    body,
  };
  const res: MockResponse = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return { req, res };
}

describe('internalAuth handler', () => {
  it('responde 401 si la clave interna es inválida', async () => {
    const { req, res } = await request('POST', { 'x-internal-key': 'wrong' }, { idToken: 'tok' });
    // @ts-expect-error - req is partial
    await internalAuth(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('responde 200 con token válido y usuario autorizado', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'uid-1', email: 'admin@test.local' });
    findAuthorizedUserMock.mockResolvedValue({
      email: 'admin@test.local',
      role: 'admin',
      active: true,
    });

    const { req, res } = await request(
      'POST',
      { 'x-internal-key': 'test-key-with-at-least-32-chars!!!' },
      { idToken: 'tok' },
    );
    // @ts-expect-error - req is partial
    await internalAuth(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
