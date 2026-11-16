import { describe, expect, it, vi } from 'vitest';

import type { CrearPropertyInputDto } from '../../ports/properties-repository';
import type { ContentResource } from '../../revalidation/revalidate-content';
import { RevalidateContent } from '../../revalidation/revalidate-content';
import { CrearPropertyUseCase } from './crear-property';

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

describe('CrearPropertyUseCase', () => {
  it('llena properties.create con el input y dispara revalidación', async () => {
    const ports = makePorts();
    const input: CrearPropertyInputDto = {
      operacion: 'VENTA',
      tipo: 'CASA',
      titulo: { es: 'Casa en venta' },
      precio: 150000000,
      departamento: 'Antioquia',
      municipio: 'Medellín',
    };

    ports.properties.create.mockResolvedValue({
      property: { codigo: 'JF-0001' },
    });
    const useCase = new CrearPropertyUseCase(
      ports.properties,
      ports.revalidateContent,
      ports.videoValidator,
      ports.logger,
    );

    const resultado = await useCase.execute({ input });

    expect(ports.properties.create).toHaveBeenCalledWith(input);
    expect(ports.revalidateContent.revalidate).toHaveBeenCalledWith('propiedades');
    expect(ports.logger.info).toHaveBeenCalledWith('property_created', {
      codigo: resultado.property.codigo,
    });
  });

  it('propaga el error si properties.create falla', async () => {
    const ports = makePorts();
    ports.properties.create.mockRejectedValue(new Error('error_creando'));

    const useCase = new CrearPropertyUseCase(
      ports.properties,
      ports.revalidateContent,
      ports.videoValidator,
      ports.logger,
    );

    await expect(
      useCase.execute({
        input: {
          operacion: 'VENTA',
          tipo: 'CASA',
          titulo: { es: 'x' },
          precio: 1,
          departamento: 'Antioquia',
          municipio: 'Medellín',
        },
      }),
    ).rejects.toThrow('error_creando');
  });

  it('valida cada URL de YouTube antes de crear', async () => {
    const ports = makePorts();
    const input: CrearPropertyInputDto = {
      operacion: 'VENTA',
      tipo: 'CASA',
      titulo: { es: 'Casa en venta' },
      precio: 150000000,
      departamento: 'Antioquia',
      municipio: 'Medellín',
      videos: ['https://youtu.be/dQw4w9WgXcQ', 'https://youtu.be/abc123'],
    };

    ports.properties.create.mockResolvedValue({
      property: { codigo: 'JF-0001' },
    });
    const useCase = new CrearPropertyUseCase(
      ports.properties,
      ports.revalidateContent,
      ports.videoValidator,
      ports.logger,
    );

    await useCase.execute({ input });

    expect(ports.videoValidator.validate).toHaveBeenCalledTimes(2);
    expect(ports.videoValidator.validate).toHaveBeenCalledWith('https://youtu.be/dQw4w9WgXcQ');
    expect(ports.videoValidator.validate).toHaveBeenCalledWith('https://youtu.be/abc123');
  });

  it('rechaza cuando una URL de YouTube es inválida', async () => {
    const ports = makePorts();
    ports.videoValidator.validate.mockRejectedValueOnce(new Error('URL de YouTube inválida'));
    ports.properties.create.mockResolvedValue({
      property: { codigo: 'JF-0001' },
    });
    const useCase = new CrearPropertyUseCase(
      ports.properties,
      ports.revalidateContent,
      ports.videoValidator,
      ports.logger,
    );

    await expect(
      useCase.execute({
        input: {
          operacion: 'VENTA',
          tipo: 'CASA',
          titulo: { es: 'Casa en venta' },
          precio: 150000000,
          departamento: 'Antioquia',
          municipio: 'Medellín',
          videos: ['https://youtu.be/invalido'],
        },
      }),
    ).rejects.toThrow('URL de YouTube inválida');

    expect(ports.properties.create).not.toHaveBeenCalled();
  });
});
