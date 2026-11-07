import type { Auth } from 'firebase-admin/auth';

import type { IdentityVerifier, VerifiedToken } from '../../application/ports/identity-verifier';

export function createFirebaseIdentityVerifier(auth: Auth): IdentityVerifier {
  return {
    async verify(idToken: string): Promise<VerifiedToken> {
      const decoded = await auth.verifyIdToken(idToken, true);
      return {
        uid: decoded.uid,
        email: decoded.email ?? null,
        emailVerified: decoded.email_verified === true,
      };
    },
  };
}
