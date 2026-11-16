import { describe, expect, it, vi } from 'vitest';

import type { ActualizarPropertyInputDto } from '../../ports/properties-repository';
import type { ContentResource } from '../../revalidation/revalidate-content';
import { RevalidateContent } from '../../revalidation/revalidate-content';
import { ActualizarPropertyUseCase } from './actualizar-property';

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

function makePorts() {
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

    const useCase = new ActualizarPropertyUseCase(
      ports.properties,
      ports.revalidateContent,
      ports.videoValidator,
      ports.logger,
    );

    await useCase.execute({
      idOrSlug: 'doc-1',
      input,
    });

    expect(ports.properties.update).toHaveBeenCalledWith('doc-1', input);
    expect(ports.revalidateContent.revalidate).toHaveBeenCalledWith('propiedades');
    expect(ports.logger.info).toHaveBeenCalledWith('property_updated', {
      idOrSlug: 'doc-1',
    });
  });

  it('propaga el error si properties.update falla', async () => {
    const ports = makePorts();
    ports.properties.update.mockRejectedValue(new Error('error_actualizando'));

    const useCase = new ActualizarPropertyUseCase(
      ports.properties,
      ports.revalidateContent,
      ports.videoValidator,
      ports.logger,
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

    ports.properties.update.mockResolvedValue({
      property: { codigo: 'JF-0001' },
    });
    const useCase = new ActualizarPropertyUseCase(
      ports.properties,
      ports.revalidateContent,
      ports.videoValidator,
      ports.logger,
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
    ports.properties.update.mockResolvedValue({
      property: { codigo: 'JF-0001' },
    });
    const useCase = new ActualizarPropertyUseCase(
      ports.properties,
      ports.revalidateContent,
      ports.videoValidator,
      ports.logger,
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
