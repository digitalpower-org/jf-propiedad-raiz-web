import { describe, expect, it, vi } from 'vitest';

import type {
  ServiceDto,
  ServiciosRepository,
  ListarPaginadoResult,
  ServiceCardDto,
} from '../../ports/services-repository';
import type { Logger } from '../../ports/logger';
import { ListarServicesUseCase } from './listar-services';

function makeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
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
    actualizar: async () => ({ service: fullService }),
    eliminar: async () => ({ service: fullService }),
    activar: async () => ({ service: fullService }),
    ocultar: async () => ({ service: fullService }),
    reordenar: async () => {},
    obtenerPorIdOSlug: async () => null,
    listarPaginado:
      overrides.listarPaginado ?? (async () => ({ items: [], nextCursor: undefined })),
  };
}

describe('ListarServicesUseCase', () => {
  it('devuelve listado paginado con items y nextCursor', async () => {
    const items: ServiceCardDto[] = Array.from({ length: 13 }, (_, i) => ({
      id: `s${i}`,
      slug: `s${i}`,
      titulo: { es: `Servicio ${i}` },
      resumen: { es: `Resumen ${i}` },
      orden: i,
    }));
    const services = makeServices({
      listarPaginado: vi
        .fn()
        .mockResolvedValue({ items, nextCursor: 'cursor-2' } as ListarPaginadoResult),
    });
    const logger = makeLogger();
    const useCase = new ListarServicesUseCase(services, logger);

    const resultado = await useCase.execute({ cursor: 'cursor-1', limit: 12 });

    expect(services.listarPaginado).toHaveBeenCalledWith({ cursor: 'cursor-1', limit: 12 });
    expect(resultado.items).toHaveLength(13);
    expect(resultado.nextCursor).toBe('cursor-2');
    expect(logger.debug).toHaveBeenCalledWith('services_listed', { items: 13 });
  });

  it('reenvía includeHidden al repositorio', async () => {
    const services = makeServices({
      listarPaginado: vi.fn().mockResolvedValue({ items: [], nextCursor: undefined }),
    });
    const logger = makeLogger();
    const useCase = new ListarServicesUseCase(services, logger);

    await useCase.execute({ cursor: 'cursor-1', limit: 12, includeHidden: true });

    expect(services.listarPaginado).toHaveBeenCalledWith({
      cursor: 'cursor-1',
      limit: 12,
      includeHidden: true,
    });
    expect(logger.debug).toHaveBeenCalledWith('services_listed', { items: 0 });
  });
});
