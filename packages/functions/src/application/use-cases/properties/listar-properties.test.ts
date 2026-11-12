import { describe, expect, it, vi } from 'vitest';

import type { FiltrosListadoPublico } from '../../ports/properties-repository';
import { ListarPropertiesUseCase } from './listar-properties';

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

describe('ListarPropertiesUseCase', () => {
  it('llena properties.listPublico con los filtros y retorna el resultado', async () => {
    const ports = makePorts();
    const useCase = new ListarPropertiesUseCase(ports.properties, ports.logger);

    const filtros: FiltrosListadoPublico = {
      operacion: 'VENTA',
      destacada: false,
    };
    const esperado = {
      items: [],
      nextCursor: undefined,
    };
    ports.properties.listPublico.mockResolvedValue(esperado);

    const resultado = await useCase.execute(filtros);

    expect(ports.properties.listPublico).toHaveBeenCalledWith(filtros);
    expect(resultado).toBe(esperado);
    expect(ports.logger.debug).toHaveBeenCalledWith('properties_listed', {
      operacion: 'VENTA',
      destacada: false,
      items: 0,
    });
  });

  it('propaga el error si properties.listPublico falla', async () => {
    const ports = makePorts();
    ports.properties.listPublico.mockRejectedValue(new Error('error_listando'));

    const useCase = new ListarPropertiesUseCase(ports.properties, ports.logger);

    await expect(useCase.execute({ operacion: 'VENTA', destacada: false })).rejects.toThrow(
      'error_listando',
    );
  });
});
