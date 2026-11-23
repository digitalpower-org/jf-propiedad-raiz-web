import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';

import { INTERNAL_KEY, setup, verifiedIdentity, makePorts } from './testing/appBuilderTestHarness';
import { API_PATHS } from './paths';
import type { ServiceDto } from '../application/ports/services-repository';
import type { Translator } from '../application/ports/translator';
import type { RevalidationGateway } from '../application/ports/revalidation-gateway';

const validCreateBody = {
  titulo: { es: 'Servicio de arquitectura', autoTranslate: true },
  resumen: { es: 'Resumen del servicio', autoTranslate: true },
  cuerpo: { es: 'Cuerpo del servicio', autoTranslate: true },
};

const validServiceDto: ServiceDto = {
  id: 's1',
  slug: 'servicio-de-arquitectura',
  status: 'HIDDEN',
  titulo: { es: 'Servicio de arquitectura', en: 'Architecture service', autoTranslate: true },
  resumen: { es: 'Resumen del servicio', en: 'Service summary', autoTranslate: true },
  cuerpo: { es: 'Cuerpo del servicio', en: 'Service body', autoTranslate: true },
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
    crear: vi.fn().mockResolvedValue({ service: validServiceDto }),
    obtenerPorIdOSlug: vi.fn().mockResolvedValue(null),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
    activar: vi.fn(),
    ocultar: vi.fn(),
    reordenar: vi.fn(),
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
    translate: vi.fn().mockResolvedValue({
      outputs: [],
      hasErrors: false,
    }),
    ...overrides,
  };
}

function makeBasePorts(translatorOverrides: Partial<Translator> = {}) {
  return makePorts({
    revalidationGateway: makeRevalidationGateway(),
    rateLimiter: makeRateLimiter(),
    services: makeServicesRepository(),
    identityVerifier: makeIdentityVerifier(),
    authorizedUsers: makeAuthorizedUsers(),
    translator: makeTranslator(translatorOverrides),
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

describe('Integración de traducción al crear servicios (MT1.4, US0.5)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/v1/services — creación con autoTranslate', () => {
    it('traduce titulo, resumen y cuerpo en un lote y crea con en y autoTranslate', async () => {
      const translator = makeTranslator({
        translate: vi.fn().mockResolvedValue({
          outputs: [
            { fieldPath: 'titulo', translated: 'Architecture service' },
            { fieldPath: 'resumen', translated: 'Service summary' },
            { fieldPath: 'cuerpo', translated: 'Service body' },
          ],
          hasErrors: false,
        }),
      });

      const ports = makeBasePorts(translator);
      const { app, services, translator: translatorPort, revalidationGateway } = setup(ports);

      const response = await request(app)
        .post(API_PATHS.services)
        .set(authHeaders('req-servicios-ok'))
        .send(validCreateBody);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      // translator.translate se llama una sola vez con los tres fieldPaths y sus textos en es
      expect(translatorPort.translate).toHaveBeenCalledTimes(1);
      expect(translatorPort.translate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ fieldPath: 'titulo', text: 'Servicio de arquitectura' }),
          expect.objectContaining({ fieldPath: 'resumen', text: 'Resumen del servicio' }),
          expect.objectContaining({ fieldPath: 'cuerpo', text: 'Cuerpo del servicio' }),
        ]),
      );

      // services.crear recibe el DTO con en traducido y autoTranslate preservado
      expect(services.crear).toHaveBeenCalledTimes(1);
      const createCall = (services.crear as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
        titulo: { es: string; en: string; autoTranslate: boolean };
        resumen: { es: string; en: string; autoTranslate: boolean };
        cuerpo: { es: string; en: string; autoTranslate: boolean };
      };

      expect(createCall.titulo).toEqual({
        es: 'Servicio de arquitectura',
        en: 'Architecture service',
        autoTranslate: true,
      });
      expect(createCall.resumen).toEqual({
        es: 'Resumen del servicio',
        en: 'Service summary',
        autoTranslate: true,
      });
      expect(createCall.cuerpo).toEqual({
        es: 'Cuerpo del servicio',
        en: 'Service body',
        autoTranslate: true,
      });

      // Revalidación de servicios disparada
      expect(revalidationGateway.revalidate).toHaveBeenCalledWith({
        paths: ['/es/servicios', '/en/services'],
        tags: ['servicios'],
      });
    });
  });

  describe('POST /api/v1/services — creación con fallo de traducción', () => {
    it('responde 201, campos en vacíos y autoTranslate=true, registra translation_failed y revalida', async () => {
      const translator = makeTranslator({
        translate: vi
          .fn()
          .mockResolvedValueOnce({ outputs: [], hasErrors: true, error: 'timeout' })
          .mockResolvedValueOnce({ outputs: [], hasErrors: true, error: 'timeout' }),
      });

      const ports = makeBasePorts(translator);
      const {
        app,
        services,
        logger,
        translator: translatorPort,
        revalidationGateway,
      } = setup(ports);

      const response = await request(app)
        .post(API_PATHS.services)
        .set(authHeaders('req-servicios-fail'))
        .send(validCreateBody);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      // translator.translate se llama dos veces (reintento)
      expect(translatorPort.translate).toHaveBeenCalledTimes(2);

      // services.crear recibe campos con en vacio y autoTranslate preservado
      expect(services.crear).toHaveBeenCalledTimes(1);
      const createCall = (services.crear as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
        titulo: { es: string; en: string; autoTranslate: boolean };
        resumen: { es: string; en: string; autoTranslate: boolean };
        cuerpo: { es: string; en: string; autoTranslate: boolean };
      };

      expect(createCall.titulo).toEqual({
        es: 'Servicio de arquitectura',
        en: '',
        autoTranslate: true,
      });
      expect(createCall.resumen).toEqual({
        es: 'Resumen del servicio',
        en: '',
        autoTranslate: true,
      });
      expect(createCall.cuerpo).toEqual({ es: 'Cuerpo del servicio', en: '', autoTranslate: true });

      // logger.error registra translation_failed con el requestId de la cabecera
      expect(logger.error).toHaveBeenCalledWith(
        'translation_failed',
        expect.anything(),
        expect.objectContaining({ requestId: 'req-servicios-fail' }),
      );

      // Revalidación de servicios sigue ocurriendo
      expect(revalidationGateway.revalidate).toHaveBeenCalledWith({
        paths: ['/es/servicios', '/en/services'],
        tags: ['servicios'],
      });
    });
  });
});
