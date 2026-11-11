import { describe, expect, it, vi } from 'vitest';

import type { AuthorizedUsersRepository } from '../../ports/authorized-users-repository';
import type { IdentityVerifier } from '../../ports/identity-verifier';
import type { Logger } from '../../ports/logger';
import { VerifyInternalSessionUseCase } from './verify-internal-session';

function makeDeps() {
  const identityVerifier: IdentityVerifier = { verify: vi.fn() };
  const authorizedUsers: AuthorizedUsersRepository = { findActiveByEmail: vi.fn() };
  const logger: Logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  return {
    identityVerifier,
    authorizedUsers,
    logger,
    useCase: new VerifyInternalSessionUseCase(identityVerifier, authorizedUsers, logger),
  };
}

describe('VerifyInternalSessionUseCase', () => {
  it('devuelve la identidad verificada y el rol autorizado', async () => {
    const { identityVerifier, authorizedUsers, logger, useCase } = makeDeps();
    vi.mocked(identityVerifier.verify).mockResolvedValue({
      uid: 'uid-1',
      email: 'admin@example.com',
      emailVerified: true,
    });
    vi.mocked(authorizedUsers.findActiveByEmail).mockResolvedValue({
      email: 'admin@example.com',
      role: 'admin',
    });

    const result = await useCase.execute({ idToken: 'token' });

    expect(result).toEqual({ uid: 'uid-1', email: 'admin@example.com', role: 'admin' });
    expect(identityVerifier.verify).toHaveBeenCalledWith('token');
    expect(authorizedUsers.findActiveByEmail).toHaveBeenCalledWith('admin@example.com');
    expect(logger.info).toHaveBeenCalledWith('internal_session_verified', { uid: 'uid-1' });
  });

  it('rechaza tokens sin correo con UNAUTHORIZED', async () => {
    const { identityVerifier, useCase } = makeDeps();
    vi.mocked(identityVerifier.verify).mockResolvedValue({
      uid: 'uid-1',
      email: null,
      emailVerified: true,
    });

    await expect(useCase.execute({ idToken: 'token' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('rechaza correos no verificados con UNAUTHORIZED', async () => {
    const { identityVerifier, useCase } = makeDeps();
    vi.mocked(identityVerifier.verify).mockResolvedValue({
      uid: 'uid-1',
      email: 'admin@example.com',
      emailVerified: false,
    });

    await expect(useCase.execute({ idToken: 'token' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('rechaza usuarios fuera de la lista blanca con PERMISSION_DENIED', async () => {
    const { identityVerifier, authorizedUsers, useCase } = makeDeps();
    vi.mocked(identityVerifier.verify).mockResolvedValue({
      uid: 'uid-1',
      email: 'admin@example.com',
      emailVerified: true,
    });
    vi.mocked(authorizedUsers.findActiveByEmail).mockResolvedValue(null);

    await expect(useCase.execute({ idToken: 'token' })).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
  });

  it('traduce un fallo del verificador a UNAUTHORIZED', async () => {
    const { identityVerifier, useCase } = makeDeps();
    vi.mocked(identityVerifier.verify).mockRejectedValue(new Error('firebase down'));

    await expect(useCase.execute({ idToken: 'token' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Token inválido o expirado',
    });
  });
});
