import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn().mockReturnValue({}),
}));
vi.mock('firebase-admin/app', () => ({
  getApps: vi.fn().mockReturnValue([]),
  getApp: vi.fn(),
  initializeApp: vi.fn(),
  cert: vi.fn(),
}));
vi.mock('./storage/r2-storage', () => ({
  presignPut: vi.fn(),
  head: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
  getRange: vi.fn(),
}));

import type { AuthorizedUsersRepository } from '../application/ports/authorized-users-repository';
import type { IdentityVerifier } from '../application/ports/identity-verifier';
import type { Logger } from '../application/ports/logger';
import { createInfrastructure } from './composition';
import type { AppConfig } from './config/env';
import { RevalidationClient } from './revalidation/revalidation-client';
import { FakeTranslator } from './translation/fake-translator';

const mocks = vi.hoisted(() => ({ createGoogleCloudTranslator: vi.fn() }));

vi.mock('./translation/google-cloud-translator', () => ({
  createGoogleCloudTranslator: mocks.createGoogleCloudTranslator,
}));

const config: AppConfig = {
  internalKey: 'x'.repeat(32),
  bffUrl: 'https://bff.example.com',
  firebaseProjectId: 'project-1',
  useFakeTranslator: true,
};

const logger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const identityVerifier: IdentityVerifier = { verify: vi.fn() };
const authorizedUsers: AuthorizedUsersRepository = { findActiveByEmail: vi.fn() };

describe('createInfrastructure', () => {
  it('respeta todas las implementaciones inyectadas', () => {
    const translator = { translate: vi.fn() };
    const revalidationGateway = { revalidate: vi.fn() };
    const secretComparator = { equals: vi.fn() };

    const infra = createInfrastructure({
      config,
      logger,
      translator,
      revalidationGateway,
      identityVerifier,
      authorizedUsers,
      secretComparator,
    });

    expect(infra.config).toBe(config);
    expect(infra.logger).toBe(logger);
    expect(infra.translator).toBe(translator);
    expect(infra.revalidationGateway).toBe(revalidationGateway);
    expect(infra.identityVerifier).toBe(identityVerifier);
    expect(infra.authorizedUsers).toBe(authorizedUsers);
    expect(infra.secretComparator).toBe(secretComparator);
  });

  it('construye el traductor falso y el cliente de revalidación por defecto', () => {
    const infra = createInfrastructure({ config, logger, identityVerifier, authorizedUsers });

    expect(infra.translator).toBeInstanceOf(FakeTranslator);
    expect(infra.revalidationGateway).toBeInstanceOf(RevalidationClient);
    expect(infra.secretComparator.equals('a', 'a')).toBe(true);
  });

  it('construye el traductor de Google cuando el fake está desactivado', () => {
    const googleTranslator = { translate: vi.fn() };
    mocks.createGoogleCloudTranslator.mockReturnValue(googleTranslator);

    const infra = createInfrastructure({
      config: { ...config, useFakeTranslator: false },
      logger,
      identityVerifier,
      authorizedUsers,
    });

    expect(mocks.createGoogleCloudTranslator).toHaveBeenCalledTimes(1);
    expect(infra.translator).toBe(googleTranslator);
  });
});
