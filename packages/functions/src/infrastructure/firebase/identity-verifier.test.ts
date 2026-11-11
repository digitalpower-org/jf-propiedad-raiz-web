import { describe, expect, it, vi } from 'vitest';
import type { Auth } from 'firebase-admin/auth';

import { createFirebaseIdentityVerifier } from './identity-verifier';

function makeAuth(decoded: Record<string, unknown>): Auth {
  return {
    verifyIdToken: vi.fn().mockResolvedValue(decoded),
  } as unknown as Auth;
}

describe('createFirebaseIdentityVerifier', () => {
  it('mapea un token verificado con correo', async () => {
    const auth = makeAuth({ uid: 'uid-1', email: 'admin@example.com', email_verified: true });
    const verifier = createFirebaseIdentityVerifier(auth);

    await expect(verifier.verify('token')).resolves.toEqual({
      uid: 'uid-1',
      email: 'admin@example.com',
      emailVerified: true,
    });
    expect(auth.verifyIdToken).toHaveBeenCalledWith('token', true);
  });

  it('normaliza correo ausente a null', async () => {
    const auth = makeAuth({ uid: 'uid-1', email_verified: true });
    const verifier = createFirebaseIdentityVerifier(auth);

    await expect(verifier.verify('token')).resolves.toEqual({
      uid: 'uid-1',
      email: null,
      emailVerified: true,
    });
  });

  it('considera no verificado cualquier valor distinto de true', async () => {
    const auth = makeAuth({ uid: 'uid-1', email: 'admin@example.com' });
    const verifier = createFirebaseIdentityVerifier(auth);

    await expect(verifier.verify('token')).resolves.toMatchObject({ emailVerified: false });
  });
});
