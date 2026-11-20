import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';

import { INTERNAL_KEY, setup, verifiedIdentity, makePorts } from './testing/appBuilderTestHarness';
import { API_PATHS } from './paths';
import type { PropertyDto } from '../application/ports/properties-repository';
import type { Translator } from '../application/ports/translator';
import type { RevalidationGateway } from '../application/ports/revalidation-gateway';

const existingProperty: PropertyDto = {
  id: 'prop-123',
  codigo: 'JF-0001',
  slug: 'casa-en-venta-medellin',
  status: 'HIDDEN',
  operacion: 'VENTA',
  tipo: 'CASA',
  titulo: { es: 'Casa en venta', en: 'House for sale', autoTranslate: true, enPendiente: false },
  descripcion: {
    es: 'Bonita casa en Medellín',
    en: 'Beautiful house in Medellín',
    autoTranslate: true,
    enPendiente: false,
  },
  precio: 150000000,
  departamento: 'Antioquia',
  municipio: 'Medellín',
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
    create: vi.fn(),
    findByIdOrSlug: vi.fn().mockResolvedValue({ property: existingProperty }),
    listPublico: vi.fn(),
    getFeatured: vi.fn(),
    update: vi.fn().mockResolvedValue({
      property: { ...existingProperty, updatedAt: '2024-01-15T11:00:00.000Z' },
    }),
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
    translate: vi.fn().mockResolvedValue({ outputs: [], hasErrors: false }),
    ...overrides,
  };
}

function makeBasePorts(translator: Translator = makeTranslator()) {
  return makePorts({
    revalidationGateway: makeRevalidationGateway(),
    rateLimiter: makeRateLimiter(),
    properties: makePropertiesRepository(),
    identityVerifier: makeIdentityVerifier(),
    authorizedUsers: makeAuthorizedUsers(),
    translator,
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

describe('Properties translation update integration (MT1.4, Wave 2, task 6)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('PUT /api/v1/properties/:idOrSlug — translation behavior', () => {
    it('Case A: same es + supplied en → translator never called, update receives manual en with enPendiente: false', async () => {
      const translator = makeTranslator();
      const ports = makeBasePorts(translator);
      const { app, properties, translator: t } = setup(ports);

      const response = await request(app)
        .put(API_PATHS.property.replace(':idOrSlug', 'prop-123'))
        .set(authHeaders('req-case-a'))
        .send({
          titulo: { es: 'Casa en venta', en: 'House for sale', autoTranslate: true },
          descripcion: {
            es: 'Bonita casa en Medellín',
            en: 'Beautiful house in Medellín',
            autoTranslate: true,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // translator.translate should never be called
      expect(t.translate).not.toHaveBeenCalled();

      // properties.update should receive the manual en with enPendiente: false
      expect(properties.update).toHaveBeenCalledTimes(1);
      const updateCall = (properties.update as ReturnType<typeof vi.fn>).mock.calls[0];
      const updateInput = updateCall[1] as {
        titulo?: { en?: string; enPendiente?: boolean };
        descripcion?: { en?: string; enPendiente?: boolean };
      };
      expect(updateInput.titulo?.en).toBe('House for sale');
      expect(updateInput.titulo?.enPendiente).toBe(false);
      expect(updateInput.descripcion?.en).toBe('Beautiful house in Medellín');
      expect(updateInput.descripcion?.enPendiente).toBe(false);
    });

    it('Case B: changed es + autoTranslate: false → no translator call, previous en retained with enPendiente: true', async () => {
      const translator = makeTranslator();
      const ports = makeBasePorts(translator);
      const { app, properties, translator: t } = setup(ports);

      const response = await request(app)
        .put(API_PATHS.property.replace(':idOrSlug', 'prop-123'))
        .set(authHeaders('req-case-b'))
        .send({
          titulo: { es: 'Casa en venta modificada', autoTranslate: false },
          descripcion: { es: 'Nueva descripción', autoTranslate: false },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // translator.translate should never be called
      expect(t.translate).not.toHaveBeenCalled();

      // properties.update should receive previous en retained with enPendiente: true
      expect(properties.update).toHaveBeenCalledTimes(1);
      const updateCall = (properties.update as ReturnType<typeof vi.fn>).mock.calls[0];
      const updateInput = updateCall[1] as {
        titulo?: { en?: string; enPendiente?: boolean };
        descripcion?: { en?: string; enPendiente?: boolean };
      };
      expect(updateInput.titulo?.en).toBe('House for sale'); // previous en retained
      expect(updateInput.titulo?.enPendiente).toBe(true);
      expect(updateInput.descripcion?.en).toBe('Beautiful house in Medellín'); // previous en retained
      expect(updateInput.descripcion?.enPendiente).toBe(true);
    });

    it('Case C: changed es + autoTranslate: true → one batch call, new en', async () => {
      const translator = makeTranslator({
        translate: vi.fn().mockResolvedValue({
          outputs: [
            { fieldPath: 'titulo', translated: 'Modified house for sale' },
            { fieldPath: 'descripcion', translated: 'New description' },
          ],
          hasErrors: false,
        }),
      });
      const ports = makeBasePorts(translator);
      const { app, properties, translator: t } = setup(ports);

      const response = await request(app)
        .put(API_PATHS.property.replace(':idOrSlug', 'prop-123'))
        .set(authHeaders('req-case-c'))
        .send({
          titulo: { es: 'Casa en venta modificada', autoTranslate: true },
          descripcion: { es: 'Nueva descripción', autoTranslate: true },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // translator.translate should be called once with batch of 2 fields
      expect(t.translate).toHaveBeenCalledTimes(1);
      const translateCall = (t.translate as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
        fieldPath: string;
        text: string;
      }[];
      expect(translateCall).toHaveLength(2);
      expect(translateCall.map((c) => c.fieldPath).sort()).toEqual(['descripcion', 'titulo']);

      // properties.update should receive new translated en
      expect(properties.update).toHaveBeenCalledTimes(1);
      const updateCall = (properties.update as ReturnType<typeof vi.fn>).mock.calls[0];
      const updateInput = updateCall[1] as {
        titulo?: { en?: string; enPendiente?: boolean };
        descripcion?: { en?: string; enPendiente?: boolean };
      };
      expect(updateInput.titulo?.en).toBe('Modified house for sale');
      expect(updateInput.titulo?.enPendiente).toBe(false);
      expect(updateInput.descripcion?.en).toBe('New description');
      expect(updateInput.descripcion?.enPendiente).toBe(false);
    });
  });
});
