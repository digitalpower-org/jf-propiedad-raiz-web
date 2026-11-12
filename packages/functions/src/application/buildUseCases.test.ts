import { describe, expect, it, vi } from 'vitest';

import type { ApplicationPorts } from './ports';
import { RevalidateContent } from './revalidation/revalidate-content';
import { TranslationService } from './translation/translation-service';
import { buildUseCases } from './buildUseCases';
import { VerifyInternalSessionUseCase } from './use-cases/auth/verify-internal-session';

function makePorts(): ApplicationPorts {
  return {
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    translator: { translate: vi.fn() },
    revalidationGateway: { revalidate: vi.fn() },
    identityVerifier: { verify: vi.fn() },
    authorizedUsers: { findActiveByEmail: vi.fn() },
    secretComparator: { equals: vi.fn() },
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
  };
}

describe('buildUseCases', () => {
  it('construye los casos de uso con los puertos inyectados', () => {
    const useCases = buildUseCases(makePorts());

    expect(useCases.verifyInternalSession).toBeInstanceOf(VerifyInternalSessionUseCase);
    expect(useCases.translationService).toBeInstanceOf(TranslationService);
    expect(useCases.revalidateContent).toBeInstanceOf(RevalidateContent);
  });
});
