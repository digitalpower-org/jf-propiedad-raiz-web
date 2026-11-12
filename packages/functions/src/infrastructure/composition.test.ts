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
vi.mock('./config/server-config', () => ({
  config: {
    nodeEnv: 'test',
    isProd: false,
    isDev: false,
    isTest: true,
    internalKey: 'x'.repeat(32),
    bffUrl: 'https://bff.example.com',
    firebaseProjectId: 'project-1',
    useFakeTranslator: true,
    resendApiKey: 're_resend_key',
    juanEmail: 'juanfer@jfpropiedadraiz.com',
    firebaseAuthEmulatorHost: undefined,
    r2: {
      endpoint: 'https://account-id.r2.cloudflarestorage.com',
      region: 'auto',
      accessKeyId: 'access-key-id',
      secretAccessKey: 'secret-access-key',
      bucket: 'jf-media',
      publicBaseUrl: 'https://media.example.com',
    },
  },
}));
vi.mock('./storage/r2-storage', () => ({
  presignPut: vi.fn(),
  head: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
  getRange: vi.fn(),
}));

import type { AuthorizedUsersRepository } from '../application/ports/authorized-users-repository';
import type { EmailSender } from '../application/ports/email-sender';
import type { IdentityVerifier } from '../application/ports/identity-verifier';
import type { Logger } from '../application/ports/logger';
import type { RateLimiter } from '../application/ports/rate-limiter';
import { createInfrastructure } from './composition';
import type { ServerConfig } from './config/server-config';
import { RevalidationClient } from './revalidation/revalidation-client';
import { FakeTranslator } from './translation/fake-translator';

const mocks = vi.hoisted(() => ({ createGoogleCloudTranslator: vi.fn() }));

vi.mock('./translation/google-cloud-translator', () => ({
  createGoogleCloudTranslator: mocks.createGoogleCloudTranslator,
}));

const config: ServerConfig = {
  nodeEnv: 'test',
  isProd: false,
  isDev: false,
  isTest: true,
  internalKey: 'x'.repeat(32),
  bffUrl: 'https://bff.example.com',
  firebaseProjectId: 'project-1',
  useFakeTranslator: true,
  resendApiKey: 're_resend_key',
  resendFromEmail: 'consignaciones@jfpropiedadraiz.com',
  juanEmail: 'juanfer@jfpropiedadraiz.com',
  firebaseAuthEmulatorHost: undefined,
  r2: {
    endpoint: 'https://account-id.r2.cloudflarestorage.com',
    region: 'auto',
    accessKeyId: 'access-key-id',
    secretAccessKey: 'secret-access-key',
    bucket: 'jf-media',
    publicBaseUrl: 'https://media.example.com',
  },
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
    const emailSender: EmailSender = { send: vi.fn() };
    const rateLimiter: RateLimiter = { check: vi.fn() };

    const infra = createInfrastructure({
      config,
      logger,
      translator,
      revalidationGateway,
      identityVerifier,
      authorizedUsers,
      secretComparator,
      emailSender,
      rateLimiter,
    });

    expect(infra.config).toBe(config);
    expect(infra.logger).toBe(logger);
    expect(infra.translator).toBe(translator);
    expect(infra.revalidationGateway).toBe(revalidationGateway);
    expect(infra.identityVerifier).toBe(identityVerifier);
    expect(infra.authorizedUsers).toBe(authorizedUsers);
    expect(infra.secretComparator).toBe(secretComparator);
    expect(infra.emailSender).toBe(emailSender);
    expect(infra.rateLimiter).toBe(rateLimiter);
  });

  it('construye el traductor falso y el cliente de revalidación por defecto', () => {
    const emailSender: EmailSender = { send: vi.fn() };
    const rateLimiter: RateLimiter = { check: vi.fn() };

    const infra = createInfrastructure({
      config,
      logger,
      identityVerifier,
      authorizedUsers,
      emailSender,
      rateLimiter,
    });

    expect(infra.translator).toBeInstanceOf(FakeTranslator);
    expect(infra.revalidationGateway).toBeInstanceOf(RevalidationClient);
    expect(infra.secretComparator.equals('a', 'a')).toBe(true);
    expect(infra.emailSender).toBe(emailSender);
    expect(infra.rateLimiter).toBe(rateLimiter);
  });

  it('construye el traductor de Google cuando el fake está desactivado', () => {
    const googleTranslator = { translate: vi.fn() };
    mocks.createGoogleCloudTranslator.mockReturnValue(googleTranslator);

    const emailSender: EmailSender = { send: vi.fn() };
    const rateLimiter: RateLimiter = { check: vi.fn() };

    const infra = createInfrastructure({
      config: { ...config, useFakeTranslator: false },
      logger,
      identityVerifier,
      authorizedUsers,
      emailSender,
      rateLimiter,
    });

    expect(mocks.createGoogleCloudTranslator).toHaveBeenCalledTimes(1);
    expect(infra.translator).toBe(googleTranslator);
  });
});
