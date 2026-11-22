import { describe, expect, it, vi } from 'vitest';

import type { AboutDto, AboutDtoInput } from '../../ports/about-repository';
import type { ContentResource } from '../../revalidation/revalidate-content';
import { RevalidateContent } from '../../revalidation/revalidate-content';
import { ActualizarAboutUseCase } from './actualizar-about';
import { TranslationService } from '../../translation/translation-service';
import { ApiError } from '../../../domain/errors/api-error';
import { errorCode } from '../../../domain/errors/errorCatalog';
import type { Translator } from '../../ports/translator';
import type { Logger } from '../../ports/logger';
import type { MediaStorage } from '../../ports/media-storage';

const seed: AboutDto = {
  titulo: { es: 'Nosotros' },
  extracto: { es: 'Somos una inmobiliaria' },
  secciones: [],
  equipo: [],
  updatedAt: '2026-01-01T00:00:00Z',
};

class FakeRevalidateContent extends RevalidateContent {
  override revalidate = vi.fn((_resource: ContentResource) => Promise.resolve({ ok: true }));

  constructor() {
    super({
      gateway: { revalidate: async () => ({ ok: true }) },
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });
  }
}

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

function baseInput(): AboutDtoInput {
  return {
    titulo: { es: 'Título Nosotros' },
    extracto: { es: 'Extracto corto' },
    secciones: [{ id: 's1', titulo: { es: 'Sección 1' }, cuerpo: { es: 'Cuerpo 1' } }],
    equipo: [
      {
        id: 'e1',
        nombre: 'Juan',
        cargo: { es: 'Cargo 1' },
        descripcion: { es: 'Desc 1' },
        foto: 'foto-nueva',
      },
    ],
  };
}

describe('ActualizarAboutUseCase', () => {
  it('valida extracto.es ≤ 500 y lanza VALIDATION_ERROR al exceder', async () => {
    // Given: extracto.es con 501 caracteres
    const about = { obtener: vi.fn().mockResolvedValue(null), guardar: vi.fn() };
    const revalidateContent = new FakeRevalidateContent();
    const mediaStorage = makeMediaStorage();
    const logger = makeLogger();
    const useCase = new ActualizarAboutUseCase({
      about,
      revalidateContent,
      mediaStorage,
      translationService: new TranslationService({ translator: makeTranslator(), logger }),
      logger,
    });

    const input = { ...baseInput(), extracto: { ...baseInput().extracto, es: 'x'.repeat(501) } };

    // When / Then: lanza VALIDATION_ERROR
    await expect(
      useCase.execute({ input, expectedUpdatedAt: 'v1', requestId: 'req-1' }),
    ).rejects.toMatchObject({ code: errorCode.validationError });

    expect(about.guardar).not.toHaveBeenCalled();
    expect(revalidateContent.revalidate).not.toHaveBeenCalled();
  });

  it('valida extracto.en manual ≤ 500 y lanza VALIDATION_ERROR al exceder', async () => {
    const about = { obtener: vi.fn().mockResolvedValue(null), guardar: vi.fn() };
    const revalidateContent = new FakeRevalidateContent();
    const mediaStorage = makeMediaStorage();
    const logger = makeLogger();
    const useCase = new ActualizarAboutUseCase({
      about,
      revalidateContent,
      mediaStorage,
      translationService: new TranslationService({ translator: makeTranslator(), logger }),
      logger,
    });

    const input = {
      ...baseInput(),
      extracto: { es: 'Extracto corto', en: 'x'.repeat(501), autoTranslate: false },
    };

    await expect(
      useCase.execute({ input, expectedUpdatedAt: 'v1', requestId: 'req-1' }),
    ).rejects.toMatchObject({ code: errorCode.validationError });

    expect(about.guardar).not.toHaveBeenCalled();
    expect(revalidateContent.revalidate).not.toHaveBeenCalled();
  });

  it('degrada extracto.en auto-traducido > 500 sin bloquear el guardado', async () => {
    const about = {
      obtener: vi.fn().mockResolvedValue(null),
      guardar: vi.fn().mockResolvedValue({ ...seed, updatedAt: 'v2' }),
    };
    const revalidateContent = new FakeRevalidateContent();
    const mediaStorage = makeMediaStorage();
    const logger = makeLogger();
    const enLargo = 'x'.repeat(501);
    const translator = makeTranslator([
      { fieldPath: 'titulo', translated: 'Título (EN)' },
      { fieldPath: 'extracto', translated: enLargo },
      { fieldPath: 'secciones[0].titulo', translated: 'Sección 1 (EN)' },
      { fieldPath: 'secciones[0].cuerpo', translated: 'Cuerpo 1 (EN)' },
      { fieldPath: 'equipo[0].cargo', translated: 'Cargo (EN)' },
      { fieldPath: 'equipo[0].descripcion', translated: 'Desc (EN)' },
    ]);
    const useCase = new ActualizarAboutUseCase({
      about,
      revalidateContent,
      mediaStorage,
      translationService: new TranslationService({ translator, logger }),
      logger,
    });

    await useCase.execute({ input: baseInput(), expectedUpdatedAt: 'v1', requestId: 'req-1' });

    expect(about.guardar).toHaveBeenCalledTimes(1);
    const [inputGuardado] = about.guardar.mock.calls[0];
    expect(inputGuardado.extracto.en).toBeUndefined();
    expect(inputGuardado.extracto.autoTranslate).toBe(true);
    expect(inputGuardado.titulo.en).toBe('Título (EN)');
    expect(logger.warn).toHaveBeenCalledWith('translation_field_degraded', {
      requestId: 'req-1',
      fieldPath: 'extracto',
      reason: 'max_length_exceeded',
      maxLength: 500,
    });
    expect(revalidateContent.revalidate).toHaveBeenCalledWith('nosotros');
  });

  it('propaga CONFLICT del repositorio cuando expectedUpdatedAt está desactualizado', async () => {
    // Given: repositorio rechaza con CONFLICT
    const conflicto = new ApiError(errorCode.conflict, 'Documento desactualizado');
    const about = {
      obtener: vi.fn().mockResolvedValue(seed),
      guardar: vi.fn().mockRejectedValue(conflicto),
    };
    const revalidateContent = new FakeRevalidateContent();
    const mediaStorage = makeMediaStorage();
    const logger = makeLogger();
    const useCase = new ActualizarAboutUseCase({
      about,
      revalidateContent,
      mediaStorage,
      translationService: new TranslationService({ translator: makeTranslator(), logger }),
      logger,
    });

    // When / Then: propaga el código CONFLICT sin cambios
    await expect(
      useCase.execute({ input: baseInput(), expectedUpdatedAt: 'viejo', requestId: 'req-1' }),
    ).rejects.toMatchObject({ code: errorCode.conflict });

    expect(revalidateContent.revalidate).not.toHaveBeenCalled();
  });

  it('resuelve la versión esperada desde el documento actual cuando no se envía', async () => {
    const actualizado: AboutDto = { ...seed, updatedAt: 'v2' };
    const about = {
      obtener: vi.fn().mockResolvedValue(seed),
      guardar: vi.fn().mockResolvedValue(actualizado),
    };
    const revalidateContent = new FakeRevalidateContent();
    const mediaStorage = makeMediaStorage();
    const logger = makeLogger();
    const useCase = new ActualizarAboutUseCase({
      about,
      revalidateContent,
      mediaStorage,
      translationService: new TranslationService({ translator: makeTranslator(), logger }),
      logger,
    });

    const resultado = await useCase.execute({ input: baseInput(), requestId: 'req-1' });

    expect(about.guardar).toHaveBeenCalledWith(expect.anything(), seed.updatedAt);
    expect(resultado).toBe(actualizado);
  });

  it('purgar derivados de foto removida o reemplazada con recurso foto', async () => {
    // Given: documento existente con foto, input reemplaza la foto
    const existente: AboutDto = {
      ...seed,
      equipo: [{ id: 'e1', nombre: 'Juan', cargo: { es: 'Cargo' }, foto: 'foto-vieja' }],
    };
    const about = {
      obtener: vi.fn().mockResolvedValue(existente),
      guardar: vi.fn().mockResolvedValue({ ...existente, updatedAt: 'v2' }),
    };
    const revalidateContent = new FakeRevalidateContent();
    const mediaStorage = makeMediaStorage();
    const logger = makeLogger();
    const translator = makeTranslator([
      { fieldPath: 'titulo', translated: 'Título (EN)' },
      { fieldPath: 'extracto', translated: 'Extracto (EN)' },
      { fieldPath: 'secciones[0].titulo', translated: 'Sección 1 (EN)' },
      { fieldPath: 'secciones[0].cuerpo', translated: 'Cuerpo 1 (EN)' },
      { fieldPath: 'equipo[0].cargo', translated: 'Cargo (EN)' },
      { fieldPath: 'equipo[0].descripcion', translated: 'Desc (EN)' },
    ]);
    const useCase = new ActualizarAboutUseCase({
      about,
      revalidateContent,
      mediaStorage,
      translationService: new TranslationService({ translator, logger }),
      logger,
    });

    const input = { ...baseInput(), equipo: [{ ...baseInput().equipo[0], foto: 'foto-nueva' }] };

    // When: ejecutar actualizar
    await useCase.execute({ input, expectedUpdatedAt: 'v1', requestId: 'req-1' });

    // Then: se purgaron derivados de la foto vieja con recurso 'foto'
    expect(mediaStorage.deleteDerivados).toHaveBeenCalledWith(['foto-vieja'], 'foto');
    expect(mediaStorage.deleteDerivados).not.toHaveBeenCalledWith(['foto-nueva'], 'foto');
  });

  it('no purga foto cuando no cambió', async () => {
    // Given: foto igual en existente e input
    const existente: AboutDto = {
      ...seed,
      equipo: [{ id: 'e1', nombre: 'Juan', cargo: { es: 'Cargo' }, foto: 'foto-misma' }],
    };
    const about = {
      obtener: vi.fn().mockResolvedValue(existente),
      guardar: vi.fn().mockResolvedValue({ ...existente, updatedAt: 'v2' }),
    };
    const revalidateContent = new FakeRevalidateContent();
    const mediaStorage = makeMediaStorage();
    const logger = makeLogger();
    const translator = makeTranslator([
      { fieldPath: 'titulo', translated: 'Título (EN)' },
      { fieldPath: 'extracto', translated: 'Extracto (EN)' },
      { fieldPath: 'secciones[0].titulo', translated: 'Sección 1 (EN)' },
      { fieldPath: 'secciones[0].cuerpo', translated: 'Cuerpo 1 (EN)' },
      { fieldPath: 'equipo[0].cargo', translated: 'Cargo (EN)' },
      { fieldPath: 'equipo[0].descripcion', translated: 'Desc (EN)' },
    ]);
    const useCase = new ActualizarAboutUseCase({
      about,
      revalidateContent,
      mediaStorage,
      translationService: new TranslationService({ translator, logger }),
      logger,
    });

    const input = { ...baseInput(), equipo: [{ ...baseInput().equipo[0], foto: 'foto-misma' }] };

    // When: ejecutar actualizar
    await useCase.execute({ input, expectedUpdatedAt: 'v1', requestId: 'req-1' });

    // Then: no se llamó a deleteDerivados
    expect(mediaStorage.deleteDerivados).not.toHaveBeenCalled();
  });

  it('traduce todos los campos traducibles en un lote y guarda con valores traducidos', async () => {
    // Given: input con campos para traducir
    const about = {
      obtener: vi.fn().mockResolvedValue(null),
      guardar: vi.fn().mockResolvedValue({ ...seed, updatedAt: 'v2' }),
    };
    const revalidateContent = new FakeRevalidateContent();
    const mediaStorage = makeMediaStorage();
    const logger = makeLogger();
    const translator = makeTranslator([
      { fieldPath: 'titulo', translated: 'Título (EN)' },
      { fieldPath: 'extracto', translated: 'Extracto (EN)' },
      { fieldPath: 'secciones[0].titulo', translated: 'Sección 1 (EN)' },
      { fieldPath: 'secciones[0].cuerpo', translated: 'Cuerpo 1 (EN)' },
      { fieldPath: 'equipo[0].cargo', translated: 'Cargo (EN)' },
      { fieldPath: 'equipo[0].descripcion', translated: 'Desc (EN)' },
    ]);
    const useCase = new ActualizarAboutUseCase({
      about,
      revalidateContent,
      mediaStorage,
      translationService: new TranslationService({ translator, logger }),
      logger,
    });

    const input = baseInput();

    // When: ejecutar actualizar
    const resultado = await useCase.execute({ input, expectedUpdatedAt: 'v1', requestId: 'req-1' });

    // Then: translateContent llamado una vez con todos los campos
    expect(translator.translate).toHaveBeenCalledTimes(1);
    expect(translator.translate).toHaveBeenCalledWith([
      { fieldPath: 'titulo', text: 'Título Nosotros' },
      { fieldPath: 'extracto', text: 'Extracto corto' },
      { fieldPath: 'secciones[0].titulo', text: 'Sección 1' },
      { fieldPath: 'secciones[0].cuerpo', text: 'Cuerpo 1' },
      { fieldPath: 'equipo[0].cargo', text: 'Cargo 1' },
      { fieldPath: 'equipo[0].descripcion', text: 'Desc 1' },
    ]);

    // Then: guardar recibió el input con traducciones aplicadas
    expect(about.guardar).toHaveBeenCalledTimes(1);
    const [inputGuardado] = about.guardar.mock.calls[0];
    expect(inputGuardado.titulo.en).toBe('Título (EN)');
    expect(inputGuardado.extracto.en).toBe('Extracto (EN)');
    expect(inputGuardado.secciones[0].titulo.en).toBe('Sección 1 (EN)');
    expect(inputGuardado.secciones[0].cuerpo.en).toBe('Cuerpo 1 (EN)');
    expect(inputGuardado.equipo[0].cargo.en).toBe('Cargo (EN)');
    expect(inputGuardado.equipo[0].descripcion!.en).toBe('Desc (EN)');

    // Then: revalidación de 'nosotros' tras guardar
    expect(revalidateContent.revalidate).toHaveBeenCalledWith('nosotros');
    expect(resultado.updatedAt).toBe('v2');
  });

  it('fallo de traducción registra translation_failed con requestId y fieldPaths', async () => {
    // Given: translation service devuelve hasErrors
    const about = {
      obtener: vi.fn().mockResolvedValue(null),
      guardar: vi.fn().mockResolvedValue({ ...seed, updatedAt: 'v2' }),
    };
    const revalidateContent = new FakeRevalidateContent();
    const mediaStorage = makeMediaStorage();
    const logger = makeLogger();
    const translator = makeTranslator([], true, 'timeout');
    const useCase = new ActualizarAboutUseCase({
      about,
      revalidateContent,
      mediaStorage,
      translationService: new TranslationService({ translator, logger }),
      logger,
    });

    const input = baseInput();

    // When: ejecutar actualizar
    await useCase.execute({ input, expectedUpdatedAt: 'v1', requestId: 'req-1' });

    // Then: se registró translation_failed con requestId y fieldPaths
    expect(logger.error).toHaveBeenCalledWith('translation_failed', expect.anything(), {
      requestId: 'req-1',
      fieldPaths: [
        'titulo',
        'extracto',
        'secciones[0].titulo',
        'secciones[0].cuerpo',
        'equipo[0].cargo',
        'equipo[0].descripcion',
      ],
    });

    // Then: guardar aún se llamó (traducción fallida no bloquea la escritura)
    expect(about.guardar).toHaveBeenCalledTimes(1);
    expect(revalidateContent.revalidate).toHaveBeenCalledWith('nosotros');
  });
});
