export interface VerifiedToken {
  readonly uid: string;
  readonly email: string | null;
  readonly emailVerified: boolean;
}

export interface IdentityVerifier {
  verify(idToken: string): Promise<VerifiedToken>;
}
