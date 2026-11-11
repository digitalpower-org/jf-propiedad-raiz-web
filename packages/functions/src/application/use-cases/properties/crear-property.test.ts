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
});
