import { z } from 'zod';

import type {
  AuthorizedUser,
  AuthorizedUsersRepository,
} from '../../application/ports/authorized-users-repository';
import { ROLES } from '../../domain/value-objects/role';

const AuthorizedUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(ROLES),
  active: z.boolean(),
});

interface AuthorizedUsersCollection {
  doc(path: string): {
    get(): Promise<{ readonly exists: boolean; data(): unknown }>;
  };
}

export function createFirestoreAuthorizedUsersRepository(
  db: AuthorizedUsersCollection,
): AuthorizedUsersRepository {
  return {
    async findActiveByEmail(email: string): Promise<AuthorizedUser | null> {
      const doc = await db.doc(`authorized_users/${email.toLowerCase()}`).get();

      if (!doc.exists) return null;

      const parsed = AuthorizedUserSchema.safeParse(doc.data());

      if (!parsed.success || !parsed.data.active) return null;

      return { email: parsed.data.email, role: parsed.data.role };
    },
  };
}
