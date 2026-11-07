import { ApiError } from '../../../domain/errors/api-error';
import type { Role } from '../../../domain/value-objects/role';
import type { AuthorizedUsersRepository } from '../../ports/authorized-users-repository';
import type { IdentityVerifier } from '../../ports/identity-verifier';
import type { Logger } from '../../ports/logger';
import type { UseCase } from '../../use-case';

export interface VerifyInternalSessionCommand {
  readonly idToken: string;
}

export interface VerifiedIdentity {
  readonly uid: string;
  readonly email: string;
  readonly role: Role;
}

export class VerifyInternalSessionUseCase
  implements UseCase<VerifyInternalSessionCommand, VerifiedIdentity>
{
  constructor(
    private readonly identityVerifier: IdentityVerifier,
    private readonly authorizedUsers: AuthorizedUsersRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: VerifyInternalSessionCommand): Promise<VerifiedIdentity> {
    const identity = await this.verifyToken(command.idToken);
    const email = identity.email;

    if (email === null || !identity.emailVerified) {
      throw new ApiError('UNAUTHORIZED', 'Correo no verificado');
    }

    const user = await this.authorizedUsers.findActiveByEmail(email);

    if (user === null) {
      throw new ApiError('PERMISSION_DENIED', 'Usuario no autorizado');
    }

    this.logger.info('internal_session_verified', { uid: identity.uid });

    return { uid: identity.uid, email, role: user.role };
  }

  private async verifyToken(idToken: string) {
    try {
      return await this.identityVerifier.verify(idToken);
    } catch {
      throw new ApiError('UNAUTHORIZED', 'Token inválido o expirado');
    }
  }
}
