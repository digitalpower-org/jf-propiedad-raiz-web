/**
 * Harness de tests para `appBuilder`.
 *
 * Extrae de `appBuilder.test.ts` (líneas 1-80) los valores y helpers compartidos:
 * `INTERNAL_KEY`, `makePorts`, `setup` y `verifiedIdentity`. Así varios archivos de
 * test pueden construir la app sin duplicar la configuración de puertos.
 */

import { vi } from 'vitest';

import type { ApplicationPorts } from '../../application/ports';
import type { AuthorizedUsersRepository } from '../../application/ports/authorized-users-repository';
import type { IdentityVerifier } from '../../application/ports/identity-verifier';
import type { Logger } from '../../application/ports/logger';
import type { RevalidationGateway } from '../../application/ports/revalidation-gateway';
import type { SecretComparator } from '../../application/ports/secret-comparator';
import type { Translator } from '../../application/ports/translator';
import { buildUseCases } from '../../application/buildUseCases';
import { appBuilder } from '../appBuilder';

export const INTERNAL_KEY = 'k'.repeat(32);

export function makePorts(overrides: Partial<ApplicationPorts> = {}) {
  const logger: Logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const translator: Translator = { translate: vi.fn() };
  const revalidationGateway: RevalidationGateway = { revalidate: vi.fn() };
  const identityVerifier: IdentityVerifier = { verify: vi.fn() };
  const authorizedUsers: AuthorizedUsersRepository = { findActiveByEmail: vi.fn() };

  const ports: ApplicationPorts = {
    logger,
    translator,
    revalidationGateway,
    identityVerifier,
    authorizedUsers,
    secretComparator: { equals: (a: string, b: string) => a === b } as SecretComparator,
    properties: {
      create: vi.fn(),
      findByIdOrSlug: vi.fn(),
      listPublico: vi.fn(),
      getFeatured: vi.fn(),
      update: vi.fn(),
      activate: vi.fn(),
      hide: vi.fn(),
      softDelete: vi.fn(),
    },
    services: {
      listar: vi.fn(),
    },
    about: {
      obtener: vi.fn(),
    },
    mediaStorage: {
      presignPut: vi.fn(),
      confirmarSubida: vi.fn(),
    },
    imageProcessor: {
      validarImagen: vi.fn(),
      generarDerivados: vi.fn(),
    },
    emailSender: { send: vi.fn() },
    rateLimiter: { check: vi.fn() },
    videoValidator: { validate: vi.fn() },
  };
  return { ...ports, ...overrides, logger };
}

export function setup(overrides: Partial<ApplicationPorts> = {}) {
  const deps = makePorts(overrides);
  const app = appBuilder(buildUseCases(deps, { consignmentToEmail: 'test@example.com' }), {
    internalKey: INTERNAL_KEY,
    logger: deps.logger,
    secretComparator: deps.secretComparator,
  });
  return { app, ...deps };
}

export const verifiedIdentity = {
  uid: 'uid-1',
  email: 'admin@example.com',
  emailVerified: true,
};
