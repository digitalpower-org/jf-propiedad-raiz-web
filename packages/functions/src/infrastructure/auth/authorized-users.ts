import { db } from '../firebase/admin';

export interface AuthorizedUser {
  readonly email: string;
  readonly role: string;
  readonly active: boolean;
}

export async function findAuthorizedUser(email: string): Promise<AuthorizedUser | null> {
  const doc = await db.doc(`authorized_users/${email.toLowerCase()}`).get();
  if (!doc.exists) return null;
  return doc.data() as AuthorizedUser;
}
