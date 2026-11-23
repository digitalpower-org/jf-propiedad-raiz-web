import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';

import { INTERNAL_KEY, setup, verifiedIdentity, makePorts } from './testing/appBuilderTestHarness';
import { API_PATHS } from './paths';
import type { AboutDto } from '../application/ports/about-repository';
import type { MediaStorage } from '../application/ports/media-storage';
import type { Translator } from '../application/ports/translator';
import type { RevalidationGateway } from '../application/ports/revalidation-gateway';

const updatedAt = '2026-01-01T00:00:00Z';

const currentAbout: AboutDto = {
  titulo: { es: 'Nosotros' },
  extracto: { es: 'Somos una inmobiliaria' },
  secciones: [],
  equipo: [],
  updatedAt,
};

const validUpdateBody = {
  titulo: { es: 'Título Nosotros', autoTranslate: true },
  extracto: { es: 'Somos una inmobiliaria actualizada', autoTranslate: true },
  secciones: [
    {
      id: 's1',
      titulo: { es: 'Sección 1', autoTranslate: true },
      cuerpo: { es: 'Cuerpo 1', autoTranslate: true },
    },
  ],
  equipo: [
    {
      id: 'e1',
      nombre: 'Juan',
      cargo: { es: 'Cargo 1', autoTranslate: true },
      descripcion: { es: 'Desc 1', autoTranslate: true },
    },
  ],
  updatedAt,
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

function makeAbout(overrides: Record<string, unknown> = {}) {
  return {
    obtener: vi.fn().mockResolvedValue(currentAbout),
    guardar: vi.fn().mockResolvedValue({ ...currentAbout, updatedAt: '2026-01-02T00:00:00Z' }),
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

function makeMediaStorage(): MediaStorage {
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
    about: makeAbout(),
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

describe('Integración de traducción al actualizar Nosotros (MT1.4, US0.5)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('PUT /api/v1/about — comportamiento de traducción', () => {
    it('traduce todos los campos traducibles en un lote y guarda con en traducido', async () => {
      const translator = makeTranslator({
        translate: vi.fn().mockResolvedValue({
          outputs: [
            { fieldPath: 'titulo', translated: 'Título Nosotros (EN)' },
            { fieldPath: 'extracto', translated: 'Somos una inmobiliaria actualizada (EN)' },
            { fieldPath: 'secciones[0].titulo', translated: 'Sección 1 (EN)' },
            { fieldPath: 'secciones[0].cuerpo', translated: 'Cuerpo 1 (EN)' },
            { fieldPath: 'equipo[0].cargo', translated: 'Cargo 1 (EN)' },
            { fieldPath: 'equipo[0].descripcion', translated: 'Desc 1 (EN)' },
          ],
          hasErrors: false,
        }),
      });

      const ports = makeBasePorts(translator);
      const { app, about, translator: translatorPort, revalidationGateway } = setup(ports);

      const response = await request(app)
        .put(API_PATHS.about)
        .set(authHeaders('req-traduccion-ok'))
        .send(validUpdateBody);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // translator.translate se llama una sola vez con todos los fieldPaths traducibles
      expect(translatorPort.translate).toHaveBeenCalledTimes(1);
      expect(translatorPort.translate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ fieldPath: 'titulo', text: 'Título Nosotros' }),
          expect.objectContaining({
            fieldPath: 'extracto',
            text: 'Somos una inmobiliaria actualizada',
          }),
          expect.objectContaining({ fieldPath: 'secciones[0].titulo', text: 'Sección 1' }),
          expect.objectContaining({ fieldPath: 'secciones[0].cuerpo', text: 'Cuerpo 1' }),
          expect.objectContaining({ fieldPath: 'equipo[0].cargo', text: 'Cargo 1' }),
          expect.objectContaining({ fieldPath: 'equipo[0].descripcion', text: 'Desc 1' }),
        ]),
      );

      // about.guardar recibe el input con los en traducidos
      expect(about.guardar).toHaveBeenCalledTimes(1);
      const [guardarInput] = (about.guardar as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(guardarInput.titulo.en).toBe('Título Nosotros (EN)');
      expect(guardarInput.extracto.en).toBe('Somos una inmobiliaria actualizada (EN)');
      expect(guardarInput.secciones[0].titulo.en).toBe('Sección 1 (EN)');
      expect(guardarInput.secciones[0].cuerpo.en).toBe('Cuerpo 1 (EN)');
      expect(guardarInput.equipo[0].cargo.en).toBe('Cargo 1 (EN)');
      expect(guardarInput.equipo[0].descripcion?.en).toBe('Desc 1 (EN)');

      // revalidación de 'nosotros' tras guardar
      expect(revalidationGateway.revalidate).toHaveBeenCalledWith(
        expect.objectContaining({ tags: expect.arrayContaining(['nosotros']) }),
      );
    });

    it('conserva el en escrito a mano con autoTranslate: false sin traducir ese campo', async () => {
      const translator = makeTranslator();
      const ports = makeBasePorts(translator);
      const { app, about, translator: translatorPort, revalidationGateway } = setup(ports);

      const response = await request(app)
        .put(API_PATHS.about)
        .set(authHeaders('req-en-manual'))
        .send({
          titulo: { es: 'Título Nosotros', en: 'Título manual (EN)', autoTranslate: false },
          extracto: {
            es: 'Somos una inmobiliaria actualizada',
            en: 'Extracto manual (EN)',
            autoTranslate: false,
          },
          secciones: [
            {
              id: 's1',
              titulo: { es: 'Sección 1', en: 'Sección 1 manual (EN)', autoTranslate: false },
              cuerpo: { es: 'Cuerpo 1', en: 'Cuerpo 1 manual (EN)', autoTranslate: false },
            },
          ],
          equipo: [
            {
              id: 'e1',
              nombre: 'Juan',
              cargo: { es: 'Cargo 1', en: 'Cargo 1 manual (EN)', autoTranslate: false },
              descripcion: { es: 'Desc 1', en: 'Desc 1 manual (EN)', autoTranslate: false },
            },
          ],
          updatedAt,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // el traductor no se invoca para ningún campo (todos tienen en manual)
      expect(translatorPort.translate).not.toHaveBeenCalled();

      // el en escrito a mano llega tal cual a about.guardar
      expect(about.guardar).toHaveBeenCalledTimes(1);
      const [guardarInput] = (about.guardar as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(guardarInput.titulo.en).toBe('Título manual (EN)');

      // la revalidación de 'nosotros' sigue ocurriendo
      expect(revalidationGateway.revalidate).toHaveBeenCalledWith(
        expect.objectContaining({ tags: expect.arrayContaining(['nosotros']) }),
      );
    });
  });
});
