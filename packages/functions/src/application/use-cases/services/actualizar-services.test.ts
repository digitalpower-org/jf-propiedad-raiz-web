import { describe, expect, it, vi } from 'vitest';

import type {
  ActualizarServiceInputDto,
  ServiceDto,
  ServiciosRepository,
} from '../../ports/services-repository';
import type { MediaStorage } from '../../ports/media-storage';
import type { Logger } from '../../ports/logger';
import { RevalidateContent } from '../../revalidation/revalidate-content';
import { TranslationService } from '../../translation/translation-service';
import { ActualizarServiceUseCase } from './actualizar-services';
import { errorCode } from '../../../domain/errors/errorCatalog';
import type { Translator } from '../../ports/translator';

function makeTranslator(
  outputs: { fieldPath: string; translated: string }[] = [],
  hasErrors = false,
  error?: string,
): Translator {
  return {
    translate: vi
      .fn()
      .mockResolvedValue({ outputs, hasErrors, ...(error !== undefined ? { error } : {}) }),
  };
}

function makeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function makeMediaStorage(): MediaStorage {
  return {
    presignPut: vi.fn(),
    confirmarSubida: vi.fn(),
    deleteDerivados: vi.fn().mockResolvedValue(undefined),
  };
}

const fullService: ServiceDto = {
  id: 's1',
  slug: 'servicio-de-arquitectura',
  status: 'ACTIVE',
  titulo: { es: 'Servicio de arquitectura' },
  resumen: { es: 'Resumen del servicio' },
  cuerpo: { es: 'Cuerpo del servicio' },
  orden: 0,
  updatedAt: '2026-01-01T00:00:00Z',
};

function makeServices(overrides: Partial<ServiciosRepository> = {}): ServiciosRepository {
  return {
    crear: async () => ({ service: { ...fullService, status: 'HIDDEN' } }),
    actualizar: overrides.actualizar ?? (async () => ({ service: fullService })),
    eliminar: async () => ({ service: fullService }),
    activar: async () => ({ service: fullService }),
    ocultar: async () => ({ service: fullService }),
    reordenar: async () => {},
    obtenerPorIdOSlug: overrides.obtenerPorIdOSlug ?? (async () => null),
    listarPaginado: async () => ({ items: [], nextCursor: undefined }),
  };
}

function baseInput(): ActualizarServiceInputDto {
  return {
    titulo: { es: 'Servicio de arquitectura' },
    resumen: { es: 'Resumen del servicio' },
    cuerpo: { es: 'Cuerpo del servicio' },
  };
}

describe('ActualizarServiceUseCase', () => {
  it('actualiza campos traducibles, permite slug propio, purga fotos removidas y revalida servicios', async () => {
    const existente = {
      service: {
        id: 's1',
        slug: 'servicio-de-arquitectura',
        status: 'ACTIVE',
        titulo: { es: 'Servicio de arquitectura' },
        resumen: { es: 'Resumen del servicio' },
        cuerpo: { es: 'Cuerpo del servicio' },
        orden: 0,
        fotos: [{ derivados: [{ clave: 'foto-vieja' }] }],
        updatedAt: '2026-01-01T00:00:00Z',
      },
      esPublico: false,
    };
    const services = makeServices({
      obtenerPorIdOSlug: vi.fn().mockResolvedValue(existente),
      actualizar: vi.fn(),
    });
    const revalidateContent = new RevalidateContent({
      gateway: { revalidate: async () => ({ ok: true }) },
      logger: makeLogger(),
    });
    revalidateContent.revalidate = vi.fn().mockResolvedValue({ ok: true });
    const mediaStorage = makeMediaStorage();
    const logger = makeLogger();
    const translator = makeTranslator([
      { fieldPath: 'titulo', translated: 'Architecture service' },
      { fieldPath: 'resumen', translated: 'Service summary' },
      { fieldPath: 'cuerpo', translated: 'Service body' },
    ]);
    const useCase = new ActualizarServiceUseCase({
      services,
      revalidateContent,
      mediaStorage,
      translationService: new TranslationService({ translator, logger }),
      logger,
    });

    const input = { ...baseInput(), fotos: [] };

    await useCase.execute({ idOrSlug: 'servicio-de-arquitectura', input, requestId: 'req-1' });

    expect(services.obtenerPorIdOSlug).toHaveBeenCalledWith('servicio-de-arquitectura', false);
    expect(services.actualizar).toHaveBeenCalledWith(
      'servicio-de-arquitectura',
      expect.objectContaining({
        titulo: expect.objectContaining({ en: 'Architecture service', autoTranslate: true }),
        resumen: expect.objectContaining({ en: 'Service summary', autoTranslate: true }),
        cuerpo: expect.objectContaining({ en: 'Service body', autoTranslate: true }),
        fotos: [],
      }),
    );
    expect(mediaStorage.deleteDerivados).toHaveBeenCalledWith(['foto-vieja'], 'foto');
    expect(revalidateContent.revalidate).toHaveBeenCalledWith('servicios');
  });

  it('rechaza slug duplicado de otro servicio con VALIDATION_ERROR', async () => {
    const existente = { service: { id: 's1', slug: 'servicio-de-arquitectura' }, esPublico: false };
    const otro = { service: { ...fullService, id: 's2', slug: 'otro-servicio' }, esPublico: false };
    const services = makeServices({
      obtenerPorIdOSlug: vi.fn().mockResolvedValueOnce(existente).mockResolvedValueOnce(otro),
      actualizar: vi.fn(),
    });
    const revalidateContent = new RevalidateContent({
      gateway: { revalidate: async () => ({ ok: true }) },
      logger: makeLogger(),
    });
    revalidateContent.revalidate = vi.fn().mockResolvedValue({ ok: true });
    const mediaStorage = makeMediaStorage();
    const logger = makeLogger();
    const useCase = new ActualizarServiceUseCase({
      services,
      revalidateContent,
      mediaStorage,
      translationService: new TranslationService({ translator: makeTranslator(), logger }),
      logger,
    });

    const input = { ...baseInput(), titulo: { es: 'Otro servicio' } };

    await expect(
      useCase.execute({ idOrSlug: 'servicio-de-arquitectura', input, requestId: 'req-1' }),
    ).rejects.toMatchObject({ code: errorCode.validationError });

    expect(services.actualizar).not.toHaveBeenCalled();
  });

  it('lanza SERVICE_NOT_FOUND cuando el servicio no existe', async () => {
    const services = makeServices({
      obtenerPorIdOSlug: vi.fn().mockResolvedValue(null),
      actualizar: vi.fn(),
    });
    const revalidateContent = new RevalidateContent({
      gateway: { revalidate: async () => ({ ok: true }) },
      logger: makeLogger(),
    });
    revalidateContent.revalidate = vi.fn().mockResolvedValue({ ok: true });
    const mediaStorage = makeMediaStorage();
    const logger = makeLogger();
    const useCase = new ActualizarServiceUseCase({
      services,
      revalidateContent,
      mediaStorage,
      translationService: new TranslationService({ translator: makeTranslator(), logger }),
      logger,
    });

    await expect(
      useCase.execute({ idOrSlug: 'no-existe', input: baseInput(), requestId: 'req-1' }),
    ).rejects.toMatchObject({ code: errorCode.serviceNotFound });

    expect(services.actualizar).not.toHaveBeenCalled();
  });

  it('fallo de traducción registra translation_failed con requestId y fieldPaths, pero aún actualiza y revalida', async () => {
    const existente = {
      service: {
        id: 's1',
        slug: 'servicio-de-arquitectura',
        status: 'ACTIVE',
        titulo: { es: 'Servicio de arquitectura' },
        resumen: { es: 'Resumen del servicio' },
        cuerpo: { es: 'Cuerpo del servicio' },
        orden: 0,
        updatedAt: '2026-01-01T00:00:00Z',
      },
      esPublico: false,
    };
    const services = makeServices({
      obtenerPorIdOSlug: vi.fn().mockResolvedValue(existente),
      actualizar: vi.fn(),
    });
    const revalidateContent = new RevalidateContent({
      gateway: { revalidate: async () => ({ ok: true }) },
      logger: makeLogger(),
    });
    revalidateContent.revalidate = vi.fn().mockResolvedValue({ ok: true });
    const mediaStorage = makeMediaStorage();
    const logger = makeLogger();
    const translator = makeTranslator([], true);
    const useCase = new ActualizarServiceUseCase({
      services,
      revalidateContent,
      mediaStorage,
      translationService: new TranslationService({ translator, logger }),
      logger,
    });

    await useCase.execute({
      idOrSlug: 'servicio-de-arquitectura',
      input: baseInput(),
      requestId: 'req-1',
    });

    expect(logger.error).toHaveBeenCalledWith('translation_failed', expect.any(Error), {
      requestId: 'req-1',
      fieldPaths: ['titulo', 'resumen', 'cuerpo'],
    });

    expect(services.actualizar).toHaveBeenCalledTimes(1);
    expect(revalidateContent.revalidate).toHaveBeenCalledWith('servicios');
  });
});
