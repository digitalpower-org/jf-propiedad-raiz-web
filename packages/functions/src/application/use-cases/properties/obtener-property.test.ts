import { describe, expect, it, vi } from 'vitest';

import { ObtenerPropertyUseCase } from './obtener-property';

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
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
}

describe('ObtenerPropertyUseCase', () => {
  it('llena properties.findByIdOrSlug con el idOrSlug y esPublico, y retorna el resultado', async () => {
    const ports = makePorts();
    const useCase = new ObtenerPropertyUseCase(ports.properties, ports.logger);

    const esperado = {
      property: {
        id: 'doc-1',
        codigo: 'JF-0001',
        slug: 'casa-en-venta-jf-0001',
        operacion: 'VENTA',
        tipo: 'CASA',
        titulo: { es: 'Casa en venta' },
        precio: 150000000,
        departamento: 'Antioquia',
        municipio: 'Medellín',
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
        fechaPublicacion: undefined,
        destacada: false,
      },
      esPublico: true,
    };
    ports.properties.findByIdOrSlug.mockResolvedValue(esperado);

    const resultado = await useCase.execute({
      idOrSlug: 'doc-1',
      esPublico: true,
    });

    expect(ports.properties.findByIdOrSlug).toHaveBeenCalledWith('doc-1', true);
    expect(resultado).toBe(esperado);
    expect(ports.logger.debug).toHaveBeenCalledWith('property_obtained', {
      idOrSlug: 'doc-1',
    });
  });

  it('lanza error si no se encuentra el inmueble', async () => {
    const ports = makePorts();
    const useCase = new ObtenerPropertyUseCase(ports.properties, ports.logger);
    ports.properties.findByIdOrSlug.mockResolvedValue(null);

    await expect(useCase.execute({ idOrSlug: 'inexistente', esPublico: true })).rejects.toThrow(
      'Inmueble no encontrado: inexistente',
    );
  });
});
