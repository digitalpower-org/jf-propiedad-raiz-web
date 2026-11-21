/**
 * Harness de tests para `appBuilder`.
 *
 * Extrae de `appBuilder.test.ts` (líneas 1-80) los valores y helpers compartidos:
 * `INTERNAL_KEY`, `makePorts`, `setup` y `verifiedIdentity`. Así varios archivos de
 * test pueden construir la app sin duplicar la configuración de puertos.
 */

import { vi } from 'vitest';

import type { ApplicationPorts } from '../../application/ports';
import type { AboutDto } from '../../application/ports/about-repository';
import type { AuthorizedUsersRepository } from '../../application/ports/authorized-users-repository';
import type { IdentityVerifier } from '../../application/ports/identity-verifier';
import type { Logger } from '../../application/ports/logger';
import type { RevalidationGateway } from '../../application/ports/revalidation-gateway';
import type { SecretComparator } from '../../application/ports/secret-comparator';
import type { Translator } from '../../application/ports/translator';
import { buildUseCases } from '../../application/buildUseCases';
import { appBuilder } from '../appBuilder';

export const INTERNAL_KEY = 'k'.repeat(32);

const aboutSeed: AboutDto = {
  titulo: { es: 'Nosotros' },
  extracto: { es: 'Somos una inmobiliaria' },
  secciones: [],
  equipo: [],
  updatedAt: '2026-01-01T00:00:00Z',
};

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
      crear: vi.fn(),
      actualizar: vi.fn(),
      eliminar: vi.fn(),
      activar: vi.fn(),
      ocultar: vi.fn(),
      reordenar: vi.fn(),
      obtenerPorIdOSlug: vi.fn(),
      listarPaginado: vi.fn(),
    },
    about: {
      obtener: vi.fn(),
      guardar: vi.fn(),
    },
    mediaStorage: {
      presignPut: vi.fn(),
      confirmarSubida: vi.fn(),
      deleteDerivados: vi.fn(),
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
  const app = appBuilder(
    buildUseCases(deps, { consignmentToEmail: 'test@example.com', aboutSeed }),
    {
      internalKey: INTERNAL_KEY,
      logger: deps.logger,
      secretComparator: deps.secretComparator,
    },
  );
  return { app, ...deps };
}

export const verifiedIdentity = {
  uid: 'uid-1',
  email: 'admin@example.com',
  emailVerified: true,
};
