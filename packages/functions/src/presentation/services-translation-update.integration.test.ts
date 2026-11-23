import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';

import { INTERNAL_KEY, setup, verifiedIdentity, makePorts } from './testing/appBuilderTestHarness';
import { API_PATHS } from './paths';
import type { ServiceDto } from '../application/ports/services-repository';
import type { Translator } from '../application/ports/translator';
import type { RevalidationGateway } from '../application/ports/revalidation-gateway';

const existingService: ServiceDto = {
  id: 's1',
  slug: 'servicio-de-arquitectura',
  status: 'ACTIVE',
  titulo: {
    es: 'Servicio de arquitectura',
    en: 'Architecture service',
    autoTranslate: true,
    enPendiente: false,
  },
  resumen: {
    es: 'Resumen del servicio',
    en: 'Service summary',
    autoTranslate: true,
    enPendiente: false,
  },
  cuerpo: {
    es: 'Cuerpo del servicio',
    en: 'Service body',
    autoTranslate: true,
    enPendiente: false,
  },
  orden: 0,
  updatedAt: '2026-01-01T00:00:00Z',
};

function makeRevalidationGateway(
  overrides: Partial<RevalidationGateway> = {},
): RevalidationGateway {
  return {
    revalidate: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  };
}

function makeRateLimiter() {
  return {
    check: vi.fn().mockResolvedValue({ allowed: true, retryAfter: undefined }),
  };
}

function makeServicesRepository(overrides: Partial<ReturnType<typeof makePorts>['services']> = {}) {
  return {
    crear: vi.fn(),
    actualizar: vi.fn().mockResolvedValue({
      service: { ...existingService, updatedAt: '2026-01-01T11:00:00.000Z' },
    }),
    eliminar: vi.fn(),
    activar: vi.fn(),
    ocultar: vi.fn(),
    reordenar: vi.fn(),
    obtenerPorIdOSlug: vi.fn().mockResolvedValue({ service: existingService, esPublico: false }),
    listarPaginado: vi.fn(),
    ...overrides,
  };
}

function makeIdentityVerifier() {
  return {
    verify: vi.fn().mockResolvedValue(verifiedIdentity),
  };
}

function makeAuthorizedUsers() {
  return {
    findActiveByEmail: vi.fn().mockResolvedValue({ email: 'admin@example.com', role: 'admin' }),
  };
}

function makeTranslator(overrides: Partial<Translator> = {}): Translator {
  return {
    translate: vi.fn().mockResolvedValue({ outputs: [], hasErrors: false }),
    ...overrides,
  };
}

function makeMediaStorage() {
  return {
    presignPut: vi.fn(),
    confirmarSubida: vi.fn(),
    deleteDerivados: vi.fn().mockResolvedValue(undefined),
  };
}

function makeBasePorts(translator: Translator = makeTranslator()) {
  return makePorts({
    revalidationGateway: makeRevalidationGateway(),
    rateLimiter: makeRateLimiter(),
    services: makeServicesRepository(),
    identityVerifier: makeIdentityVerifier(),
    authorizedUsers: makeAuthorizedUsers(),
    translator,
    mediaStorage: makeMediaStorage(),
  });
}

function authHeaders(requestId = 'req-test-123') {
  return {
    'X-Internal-Key': INTERNAL_KEY,
    'X-User-Id': verifiedIdentity.uid,
    'X-User-Role': 'admin',
    'X-User-Email': verifiedIdentity.email,
    'X-Request-Id': requestId,
  };
}

describe('Integración de traducción al actualizar servicios (MT1.4, US0.5)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('PUT /api/v1/services/:idOrSlug — comportamiento de traducción', () => {
    it('cambia es con autoTranslate → una sola llamada al traductor con el campo modificado y conserva el en anterior en los demás', async () => {
      const translator = makeTranslator({
        translate: vi.fn().mockResolvedValue({
          outputs: [{ fieldPath: 'titulo', translated: 'Modified architecture service' }],
          hasErrors: false,
        }),
      });
      const ports = makeBasePorts(translator);
      const { app, services, translator: t, revalidationGateway } = setup(ports);

      const response = await request(app)
        .put(API_PATHS.service.replace(':idOrSlug', 'servicio-de-arquitectura'))
        .set(authHeaders('req-case-a'))
        .send({
          updatedAt: existingService.updatedAt,
          titulo: { es: 'Servicio de arquitectura modificado', autoTranslate: true },
          resumen: { es: 'Resumen del servicio', autoTranslate: true },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(t.translate).toHaveBeenCalledTimes(1);
      const translateCall = (t.translate as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
        fieldPath: string;
        text: string;
      }[];
      expect(translateCall).toEqual([
        { fieldPath: 'titulo', text: 'Servicio de arquitectura modificado' },
      ]);

      expect(services.actualizar).toHaveBeenCalledTimes(1);
      const updateCall = (services.actualizar as ReturnType<typeof vi.fn>).mock.calls[0];
      const updateInput = updateCall[1] as {
        titulo?: { en?: string; autoTranslate?: boolean };
        resumen?: { en?: string; autoTranslate?: boolean };
      };
      expect(updateInput.titulo?.en).toBe('Modified architecture service');
      expect(updateInput.titulo?.autoTranslate).toBe(true);
      expect(updateInput.resumen?.en).toBe('Service summary'); // previous en retained
      expect(updateInput.resumen?.autoTranslate).toBe(true);

      expect(revalidationGateway.revalidate).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ['servicios'] }),
      );
    });

    it('cambia es con en manual y autoTranslate: false → sin traducción, en literal y revalidación', async () => {
      const translator = makeTranslator();
      const ports = makeBasePorts(translator);
      const { app, services, translator: t, revalidationGateway } = setup(ports);

      const response = await request(app)
        .put(API_PATHS.service.replace(':idOrSlug', 'servicio-de-arquitectura'))
        .set(authHeaders('req-case-b'))
        .send({
          updatedAt: existingService.updatedAt,
          titulo: {
            es: 'Servicio de arquitectura modificado',
            en: 'Manual English title',
            autoTranslate: false,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      expect(t.translate).not.toHaveBeenCalled();

      expect(services.actualizar).toHaveBeenCalledTimes(1);
      const updateCall = (services.actualizar as ReturnType<typeof vi.fn>).mock.calls[0];
      const updateInput = updateCall[1] as {
        titulo?: { en?: string; autoTranslate?: boolean };
      };
      expect(updateInput.titulo?.en).toBe('Manual English title'); // verbatim
      expect(updateInput.titulo?.autoTranslate).toBe(false);

      expect(revalidationGateway.revalidate).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ['servicios'] }),
      );
    });
  });
});
