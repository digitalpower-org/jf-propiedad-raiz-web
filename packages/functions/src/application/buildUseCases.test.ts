import { describe, expect, it, vi } from 'vitest';

import type { ApplicationPorts } from './ports';
import type { AboutDto } from './ports/about-repository';
import type { ConsignmentEmailNotificationRepository } from './ports/consignment-email-notification-repository';
import type { DeliveryWebhookVerifier } from './ports/delivery-webhook-verifier';
import { RevalidateContent } from './revalidation/revalidate-content';
import { TranslationService } from './translation/translation-service';
import { buildUseCases } from './buildUseCases';
import { VerifyInternalSessionUseCase } from './use-cases/auth/verify-internal-session';
import { CrearServiceUseCase } from './use-cases/services/crear-services';
import { ActualizarServiceUseCase } from './use-cases/services/actualizar-services';
import { EliminarServiceUseCase } from './use-cases/services/eliminar-services';
import { ActivarServiceUseCase } from './use-cases/services/activar-services';
import { OcultarServiceUseCase } from './use-cases/services/ocultar-services';
import { ReordenarServiceUseCase } from './use-cases/services/reordenar-services';
import { ObtenerServiceUseCase } from './use-cases/services/obtener-services';
import { ListarServicesUseCase } from './use-cases/services/listar-services';

const aboutSeed: AboutDto = {
  titulo: { es: 'Nosotros' },
  extracto: { es: 'Somos una inmobiliaria' },
  secciones: [],
  equipo: [],
  updatedAt: '2026-01-01T00:00:00Z',
};

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
    consignmentEmailNotificationRepository: {
      appendIfAbsent: vi.fn(),
      listByRequestId: vi.fn(),
    } as ConsignmentEmailNotificationRepository,
    deliveryWebhookVerifier: {
      verify: vi.fn(),
    } as DeliveryWebhookVerifier,
    rateLimiter: { check: vi.fn() },
    videoValidator: { validate: vi.fn() },
  };
}

describe('buildUseCases', () => {
  it('construye los casos de uso con los puertos inyectados', () => {
    const useCases = buildUseCases(makePorts(), {
      consignmentToEmail: 'test@example.com',
      aboutSeed,
      consignmentNotificationTtlSeconds: 86400,
    });

    expect(useCases.verifyInternalSession).toBeInstanceOf(VerifyInternalSessionUseCase);
    expect(useCases.translationService).toBeInstanceOf(TranslationService);
    expect(useCases.revalidateContent).toBeInstanceOf(RevalidateContent);
    expect(useCases.listarServices).toBeInstanceOf(ListarServicesUseCase);
    expect(useCases.crearService).toBeInstanceOf(CrearServiceUseCase);
    expect(useCases.actualizarService).toBeInstanceOf(ActualizarServiceUseCase);
    expect(useCases.eliminarService).toBeInstanceOf(EliminarServiceUseCase);
    expect(useCases.activarService).toBeInstanceOf(ActivarServiceUseCase);
    expect(useCases.ocultarService).toBeInstanceOf(OcultarServiceUseCase);
    expect(useCases.reordenarService).toBeInstanceOf(ReordenarServiceUseCase);
    expect(useCases.obtenerService).toBeInstanceOf(ObtenerServiceUseCase);
    expect(useCases.registrarNotificacionResend).toBeDefined();
    expect(useCases.deliveryWebhookVerifier).toBeDefined();
  });
});
