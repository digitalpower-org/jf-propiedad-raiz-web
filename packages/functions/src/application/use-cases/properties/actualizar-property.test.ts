import { describe, expect, it, vi } from 'vitest';

import type { ActualizarPropertyInputDto } from '../../ports/properties-repository';
import type { ContentResource } from '../../revalidation/revalidate-content';
import { RevalidateContent } from '../../revalidation/revalidate-content';
import { ActualizarPropertyUseCase } from './actualizar-property';
import { TranslationService } from '../../translation/translation-service';
import { NoopLogger } from '../../../infrastructure/logging/noop-logger';
import type { Translator } from '../../ports/translator';
import type { PropertyDto } from '../../ports/properties-repository';

class FakeRevalidateContent extends RevalidateContent {
  override revalidate = vi.fn((_resource: ContentResource) => Promise.resolve({ ok: true }));

  constructor() {
    super({
      gateway: { revalidate: async () => ({ ok: true }) },
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    });
  }
}

function makeIncompleteProperty(): PropertyDto {
  return {
    id: 'doc-1',
    codigo: 'JF-0001',
    slug: 'casa-jf-0001',
    status: 'HIDDEN',
    operacion: 'VENTA',
    tipo: 'CASA',
    titulo: { es: 'Casa bonita' },
    precio: 200000000,
    departamento: 'Antioquia',
    municipio: 'Medellín',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    destacada: false,
    fotos: [],
  };
}

function makePorts() {
  const translator: Translator = {
    translate: vi
      .fn()
      .mockImplementation((inputs: readonly { fieldPath: string; text: string }[]) => ({
        outputs: inputs.map((i) => ({ fieldPath: i.fieldPath, translated: i.text })),
        hasErrors: false,
      })),
  };
  return {
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
    revalidateContent: new FakeRevalidateContent(),
    videoValidator: {
      validate: vi.fn().mockResolvedValue(undefined),
    },
    translationService: new TranslationService({ translator, logger: new NoopLogger() }),
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
}

describe('ActualizarPropertyUseCase', () => {
  it('llena properties.update con idOrSlug e input, y dispara revalidación', async () => {
    const ports = makePorts();
    const input: ActualizarPropertyInputDto = {
      precio: 200000000,
    };

    // Mock findByIdOrSlug to return an incomplete property (no auto-activation)
    ports.properties.findByIdOrSlug.mockResolvedValue({
      property: makeIncompleteProperty(),
      esPublico: false,
    });
    // Mock update to return the updated property
    ports.properties.update.mockResolvedValue({
      property: { ...makeIncompleteProperty(), precio: 200000000 },
    });

    const useCase = new ActualizarPropertyUseCase(
      ports.properties,
      ports.revalidateContent,
      ports.videoValidator,
      ports.logger,
      ports.translationService,
    );

    await useCase.execute({
      idOrSlug: 'doc-1',
      input,
    });

    expect(ports.properties.update).toHaveBeenCalledWith('doc-1', input, undefined);
    expect(ports.revalidateContent.revalidate).toHaveBeenCalledWith('propiedades');
    expect(ports.logger.info).toHaveBeenCalledWith('property_updated', {
      idOrSlug: 'doc-1',
    });
  });

  it('propaga el error si properties.update falla', async () => {
    const ports = makePorts();
    ports.properties.findByIdOrSlug.mockResolvedValue({
      property: makeIncompleteProperty(),
      esPublico: false,
    });
    ports.properties.update.mockRejectedValue(new Error('error_actualizando'));

    const useCase = new ActualizarPropertyUseCase(
      ports.properties,
      ports.revalidateContent,
      ports.videoValidator,
      ports.logger,
      ports.translationService,
    );

    await expect(
      useCase.execute({
        idOrSlug: 'doc-1',
        input: { precio: 200000000 },
      }),
    ).rejects.toThrow('error_actualizando');
  });

  it('valida cada URL de YouTube antes de actualizar', async () => {
    const ports = makePorts();
    const input: ActualizarPropertyInputDto = {
      precio: 200000000,
      videos: ['https://youtu.be/dQw4w9WgXcQ', 'https://youtu.be/abc123'],
    };

    ports.properties.findByIdOrSlug.mockResolvedValue({
      property: makeIncompleteProperty(),
      esPublico: false,
    });
    ports.properties.update.mockResolvedValue({
      property: { ...makeIncompleteProperty(), precio: 200000000 },
    });
    const useCase = new ActualizarPropertyUseCase(
      ports.properties,
      ports.revalidateContent,
      ports.videoValidator,
      ports.logger,
      ports.translationService,
    );

    await useCase.execute({
      idOrSlug: 'doc-1',
      input,
    });

    expect(ports.videoValidator.validate).toHaveBeenCalledTimes(2);
    expect(ports.videoValidator.validate).toHaveBeenCalledWith('https://youtu.be/dQw4w9WgXcQ');
    expect(ports.videoValidator.validate).toHaveBeenCalledWith('https://youtu.be/abc123');
  });

  it('rechaza cuando una URL de YouTube es inválida en actualización', async () => {
    const ports = makePorts();
    ports.videoValidator.validate.mockRejectedValueOnce(new Error('URL de YouTube inválida'));
    ports.properties.findByIdOrSlug.mockResolvedValue({
      property: makeIncompleteProperty(),
      esPublico: false,
    });
    ports.properties.update.mockResolvedValue({
      property: { ...makeIncompleteProperty(), precio: 200000000 },
    });
    const useCase = new ActualizarPropertyUseCase(
      ports.properties,
      ports.revalidateContent,
      ports.videoValidator,
      ports.logger,
      ports.translationService,
    );

    await expect(
      useCase.execute({
        idOrSlug: 'doc-1',
        input: {
          precio: 200000000,
          videos: ['https://youtu.be/invalido'],
        },
      }),
    ).rejects.toThrow('URL de YouTube inválida');

    expect(ports.properties.update).not.toHaveBeenCalled();
  });
});
