import { describe, expect, it, vi } from 'vitest';

import type {
  CrearServiceInputDto,
  CrearServiceResult,
  ObtenerPorIdOSlugResult,
  ServiceDto,
} from '../../ports/services-repository';
import type { MediaStorage } from '../../ports/media-storage';
import type { Translator } from '../../ports/translator';
import type { Logger } from '../../ports/logger';
import { RevalidateContent } from '../../revalidation/revalidate-content';
import { TranslationService } from '../../translation/translation-service';
import { CrearServiceUseCase } from './crear-services';
import { errorCode } from '../../../domain/errors/errorCatalog';

function makeTranslator(
  outputs: { fieldPath: string; translated: string }[] = [],
  hasErrors = false,
): Translator {
  return {
    translate: vi.fn().mockResolvedValue({ outputs, hasErrors }),
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

function baseInput(): CrearServiceInputDto {
  return {
    titulo: { es: 'Servicio de arquitectura' },
    resumen: { es: 'Resumen del servicio' },
    cuerpo: { es: 'Cuerpo del servicio' },
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

function makeServices(overrides: {
  obtenerPorIdOSlug?: (
    idOrSlug: string,
    esPublico: boolean,
  ) => Promise<ObtenerPorIdOSlugResult | null>;
  crear?: (input: CrearServiceInputDto) => Promise<CrearServiceResult>;
}) {
  return {
    crear:
      overrides.crear ??
      (async (_input: CrearServiceInputDto) => ({ service: { ...fullService, status: 'HIDDEN' } })),
    actualizar: async () => ({ service: fullService }),
    eliminar: async () => ({ service: fullService }),
    activar: async () => ({ service: fullService }),
    ocultar: async () => ({ service: fullService }),
    reordenar: async () => {},
    obtenerPorIdOSlug: overrides.obtenerPorIdOSlug ?? (async () => null),
    listarPaginado: async () => ({ items: [], nextCursor: undefined }),
  };
}

describe('CrearServiceUseCase', () => {
  it('crea servicio con status HIDDEN, traduce campos y revalida servicios', async () => {
    // Given: slug libre y traducción exitosa
    const services = makeServices({
      obtenerPorIdOSlug: vi.fn().mockResolvedValue(null),
      crear: vi.fn().mockResolvedValue({
        service: {
          id: 's1',
          slug: 'servicio-de-arquitectura',
          status: 'HIDDEN',
          titulo: { es: 'Servicio de arquitectura', en: 'Architecture service' },
          resumen: { es: 'Resumen del servicio', en: 'Service summary' },
          cuerpo: { es: 'Cuerpo del servicio', en: 'Service body' },
          orden: 0,
          updatedAt: '2026-01-01T00:00:00Z',
        },
      }),
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
    const useCase = new CrearServiceUseCase({
      services: services,
      revalidateContent: revalidateContent,
      mediaStorage,
      translationService: new TranslationService({ translator, logger }),
      logger,
    });

    // When: ejecutar crear
    const resultado = await useCase.execute({ input: baseInput(), requestId: 'req-1' });

    // Then: slug validado, crear llamado con input traducido, revalidación de servicios
    expect(services.obtenerPorIdOSlug).toHaveBeenCalledWith('servicio-de-arquitectura', false);
    expect(services.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: expect.objectContaining({
          es: 'Servicio de arquitectura',
          en: 'Architecture service',
          autoTranslate: true,
        }),
        resumen: expect.objectContaining({
          es: 'Resumen del servicio',
          en: 'Service summary',
          autoTranslate: true,
        }),
        cuerpo: expect.objectContaining({
          es: 'Cuerpo del servicio',
          en: 'Service body',
          autoTranslate: true,
        }),
      }),
    );
    expect(revalidateContent.revalidate).toHaveBeenCalledWith('servicios');
    expect(resultado.service.status).toBe('HIDDEN');
    expect(logger.info).toHaveBeenCalledWith('service_created', {
      id: 's1',
      slug: 'servicio-de-arquitectura',
      requestId: 'req-1',
    });
  });

  it('rechaza slug duplicado con VALIDATION_ERROR y no crea ni revalida', async () => {
    // Given: slug ya existe en otro servicio
    const services = makeServices({
      obtenerPorIdOSlug: vi.fn().mockResolvedValue({
        service: { id: 's2', slug: 'servicio-de-arquitectura' },
        esPublico: false,
      }),
      crear: vi.fn(),
    });
    const revalidateContent = new RevalidateContent({
      gateway: { revalidate: async () => ({ ok: true }) },
      logger: makeLogger(),
    });
    revalidateContent.revalidate = vi.fn().mockResolvedValue({ ok: true });
    const mediaStorage = makeMediaStorage();
    const logger = makeLogger();
    const useCase = new CrearServiceUseCase({
      services: services,
      revalidateContent: revalidateContent,
      mediaStorage,
      translationService: new TranslationService({ translator: makeTranslator(), logger }),
      logger,
    });

    // When / Then: lanza VALIDATION_ERROR
    await expect(useCase.execute({ input: baseInput() })).rejects.toMatchObject({
      code: errorCode.validationError,
    });

    expect(services.crear).not.toHaveBeenCalled();
    expect(revalidateContent.revalidate).not.toHaveBeenCalled();
  });

  it('fallo de traducción registra translation_failed con requestId y fieldPaths, pero aún crea y revalida', async () => {
    // Given: translation service devuelve hasErrors
    const services = makeServices({
      obtenerPorIdOSlug: vi.fn().mockResolvedValue(null),
      crear: vi.fn().mockResolvedValue({
        service: {
          id: 's1',
          slug: 'servicio-de-arquitectura',
          status: 'HIDDEN',
          titulo: { es: 'Servicio de arquitectura' },
          resumen: { es: 'Resumen del servicio' },
          cuerpo: { es: 'Cuerpo del servicio' },
          orden: 0,
          updatedAt: '2026-01-01T00:00:00Z',
        },
      }),
    });
    const revalidateContent = new RevalidateContent({
      gateway: { revalidate: async () => ({ ok: true }) },
      logger: makeLogger(),
    });
    revalidateContent.revalidate = vi.fn().mockResolvedValue({ ok: true });
    const mediaStorage = makeMediaStorage();
    const logger = makeLogger();
    const translator = makeTranslator([], true);
    const useCase = new CrearServiceUseCase({
      services: services,
      revalidateContent: revalidateContent,
      mediaStorage,
      translationService: new TranslationService({ translator, logger }),
      logger,
    });

    // When: ejecutar crear
    await useCase.execute({ input: baseInput(), requestId: 'req-1' });

    // Then: se registró translation_failed con requestId y fieldPaths
    expect(logger.error).toHaveBeenCalledWith('translation_failed', expect.any(Error), {
      requestId: 'req-1',
      fieldPaths: ['titulo', 'resumen', 'cuerpo'],
    });

    // Then: crear y revalidación aún se ejecutan
    expect(services.crear).toHaveBeenCalledTimes(1);
    expect(revalidateContent.revalidate).toHaveBeenCalledWith('servicios');
  });
});
