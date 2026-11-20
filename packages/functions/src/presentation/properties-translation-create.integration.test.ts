import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';

import { INTERNAL_KEY, setup, verifiedIdentity, makePorts } from './testing/appBuilderTestHarness';
import { API_PATHS } from './paths';
import type { PropertyDto } from '../application/ports/properties-repository';
import type { Translator } from '../application/ports/translator';
import type { RevalidationGateway } from '../application/ports/revalidation-gateway';

const validCreateBody = {
  operacion: 'VENTA',
  tipo: 'CASA',
  titulo: { es: 'Casa en venta', autoTranslate: true },
  descripcion: { es: 'Bonita casa en venta', autoTranslate: true },
  precio: 150000000,
  departamento: 'Antioquia',
  municipio: 'Medellín',
  acabados: { es: 'Acabados de lujo', autoTranslate: true },
  puntosInteres: [
    { categoria: 'EDUCACION', etiqueta: { es: 'Colegio cercano', autoTranslate: true } },
    { categoria: 'PARQUES', etiqueta: { es: 'Parque central', autoTranslate: true } },
  ],
};

const validPropertyDto: PropertyDto = {
  id: 'prop-123',
  codigo: 'JF-0001',
  slug: 'casa-en-venta-medellin',
  status: 'HIDDEN',
  operacion: 'VENTA',
  tipo: 'CASA',
  titulo: { es: 'Casa en venta', en: 'House for sale', enPendiente: false, autoTranslate: true },
  descripcion: {
    es: 'Bonita casa en venta',
    en: 'Beautiful house for sale',
    enPendiente: false,
    autoTranslate: true,
  },
  precio: 150000000,
  departamento: 'Antioquia',
  municipio: 'Medellín',
  acabados: {
    es: 'Acabados de lujo',
    en: 'Luxury finishes',
    enPendiente: false,
    autoTranslate: true,
  },
  puntosInteres: [
    {
      categoria: 'EDUCACION',
      etiqueta: {
        es: 'Colegio cercano',
        en: 'Nearby school',
        enPendiente: false,
        autoTranslate: true,
      },
    },
    {
      categoria: 'ZONA_COMERCIAL',
      etiqueta: {
        es: 'Parque central',
        en: 'Central park',
        enPendiente: false,
        autoTranslate: true,
      },
    },
  ],
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
  destacada: false,
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

function makePropertiesRepository(
  overrides: Partial<ReturnType<typeof makePorts>['properties']> = {},
) {
  return {
    create: vi.fn().mockResolvedValue({ property: validPropertyDto }),
    findByIdOrSlug: vi.fn(),
    listPublico: vi.fn(),
    getFeatured: vi.fn(),
    update: vi.fn(),
    activate: vi.fn(),
    hide: vi.fn(),
    softDelete: vi.fn(),
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
    properties: makePropertiesRepository(),
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

describe('Properties translation create integration (MT1.4, US0.5)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/v1/properties — create with autoTranslate (happy path)', () => {
    it('traduce todos los campos candidatos en un único lote y persiste con en/enPendiente=false', async () => {
      const translator = makeTranslator({
        translate: vi.fn().mockResolvedValue({
          outputs: [
            { fieldPath: 'titulo', translated: 'House for sale' },
            { fieldPath: 'descripcion', translated: 'Beautiful house for sale' },
            { fieldPath: 'acabados', translated: 'Luxury finishes' },
            { fieldPath: 'puntosInteres[0].etiqueta', translated: 'Nearby school' },
            { fieldPath: 'puntosInteres[1].etiqueta', translated: 'Central park' },
          ],
          hasErrors: false,
        }),
      });

      const ports = makeBasePorts(translator);
      const { app, properties, translator: translatorPort } = setup(ports);

      const response = await request(app)
        .post(API_PATHS.properties)
        .set(authHeaders('req-traduccion-ok'))
        .send(validCreateBody);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      // Verificar que translator.translate se llamó una sola vez con todos los fieldPaths esperados
      expect(translatorPort.translate).toHaveBeenCalledTimes(1);
      expect(translatorPort.translate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ fieldPath: 'titulo', text: 'Casa en venta' }),
          expect.objectContaining({ fieldPath: 'descripcion', text: 'Bonita casa en venta' }),
          expect.objectContaining({ fieldPath: 'acabados', text: 'Acabados de lujo' }),
          expect.objectContaining({
            fieldPath: 'puntosInteres[0].etiqueta',
            text: 'Colegio cercano',
          }),
          expect.objectContaining({
            fieldPath: 'puntosInteres[1].etiqueta',
            text: 'Parque central',
          }),
        ]),
      );

      // Verificar que el DTO pasado a properties.create tiene en, enPendiente: false, autoTranslate preservado
      expect(properties.create).toHaveBeenCalledTimes(1);
      const createCall = (properties.create as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as typeof validCreateBody & {
        titulo: { es: string; en: string; enPendiente: boolean; autoTranslate: boolean };
        descripcion: { es: string; en: string; enPendiente: boolean; autoTranslate: boolean };
        acabados: { es: string; en: string; enPendiente: boolean; autoTranslate: boolean };
        puntosInteres: Array<{
          categoria: string;
          etiqueta: { es: string; en: string; enPendiente: boolean; autoTranslate: boolean };
        }>;
      };

      expect(createCall.titulo).toEqual({
        es: 'Casa en venta',
        en: 'House for sale',
        enPendiente: false,
        autoTranslate: true,
      });
      expect(createCall.descripcion).toEqual({
        es: 'Bonita casa en venta',
        en: 'Beautiful house for sale',
        enPendiente: false,
        autoTranslate: true,
      });
      expect(createCall.acabados).toEqual({
        es: 'Acabados de lujo',
        en: 'Luxury finishes',
        enPendiente: false,
        autoTranslate: true,
      });
      expect(createCall.puntosInteres).toHaveLength(2);
      expect(createCall.puntosInteres[0].etiqueta).toEqual({
        es: 'Colegio cercano',
        en: 'Nearby school',
        enPendiente: false,
        autoTranslate: true,
      });
      expect(createCall.puntosInteres[1].etiqueta).toEqual({
        es: 'Parque central',
        en: 'Central park',
        enPendiente: false,
        autoTranslate: true,
      });

      // Verificar que NO hay enPendiente en el request crudo (el handler no lo envía)
      expect(validCreateBody.titulo).not.toHaveProperty('enPendiente');
      expect(validCreateBody.descripcion).not.toHaveProperty('enPendiente');
      expect(validCreateBody.acabados).not.toHaveProperty('enPendiente');
      expect(validCreateBody.puntosInteres?.[0].etiqueta).not.toHaveProperty('enPendiente');
      expect(validCreateBody.puntosInteres?.[1].etiqueta).not.toHaveProperty('enPendiente');
    });
  });

  describe('POST /api/v1/properties — create with translation failure', () => {
    it('responde 201, campos quedan en "" / enPendiente=true, y loguea translation_failed con requestId', async () => {
      const translator = makeTranslator({
        translate: vi
          .fn()
          .mockResolvedValueOnce({
            outputs: [],
            hasErrors: true,
            error: 'timeout',
          })
          .mockResolvedValueOnce({
            outputs: [],
            hasErrors: true,
            error: 'timeout',
          }),
      });

      const ports = makeBasePorts(translator);
      const { app, properties, logger, translator: translatorPort } = setup(ports);

      const response = await request(app)
        .post(API_PATHS.properties)
        .set(authHeaders('req-traduccion-1'))
        .send(validCreateBody);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      // Verificar que translator.translate se llamó dos veces (reintento)
      expect(translatorPort.translate).toHaveBeenCalledTimes(2);

      // Verificar que el DTO pasado a properties.create tiene en === '' y enPendiente: true
      expect(properties.create).toHaveBeenCalledTimes(1);
      const createCall = (properties.create as ReturnType<typeof vi.fn>).mock
        .calls[0][0] as typeof validCreateBody & {
        titulo: { es: string; en: string; enPendiente: boolean; autoTranslate: boolean };
        descripcion: { es: string; en: string; enPendiente: boolean; autoTranslate: boolean };
        acabados: { es: string; en: string; enPendiente: boolean; autoTranslate: boolean };
        puntosInteres: Array<{
          categoria: string;
          etiqueta: { es: string; en: string; enPendiente: boolean; autoTranslate: boolean };
        }>;
      };

      expect(createCall.titulo).toEqual({
        es: 'Casa en venta',
        en: '',
        enPendiente: true,
        autoTranslate: true,
      });
      expect(createCall.descripcion).toEqual({
        es: 'Bonita casa en venta',
        en: '',
        enPendiente: true,
        autoTranslate: true,
      });
      expect(createCall.acabados).toEqual({
        es: 'Acabados de lujo',
        en: '',
        enPendiente: true,
        autoTranslate: true,
      });
      expect(createCall.puntosInteres).toHaveLength(2);
      expect(createCall.puntosInteres[0].etiqueta).toEqual({
        es: 'Colegio cercano',
        en: '',
        enPendiente: true,
        autoTranslate: true,
      });
      expect(createCall.puntosInteres[1].etiqueta).toEqual({
        es: 'Parque central',
        en: '',
        enPendiente: true,
        autoTranslate: true,
      });

      // Verificar que logger.error se llamó con 'translation_failed', error, y requestId exacto
      expect(logger.error).toHaveBeenCalledWith(
        'translation_failed',
        'timeout',
        expect.objectContaining({
          requestId: 'req-traduccion-1',
          fieldPaths: expect.arrayContaining([
            'titulo',
            'descripcion',
            'acabados',
            'puntosInteres[0].etiqueta',
            'puntosInteres[1].etiqueta',
          ]),
        }),
      );
    });
  });
});
