import type { Role } from '../../domain/value-objects/role';

export interface AuthorizedUser {
  readonly email: string;
  readonly role: Role;
}

export interface AuthorizedUsersRepository {
  findActiveByEmail(email: string): Promise<AuthorizedUser | null>;
}
