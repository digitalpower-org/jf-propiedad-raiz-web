import { describe, expect, it, vi } from 'vitest';

import type {
  ServiceDto,
  ServiciosRepository,
  ObtenerPorIdOSlugResult,
} from '../../ports/services-repository';
import type { Logger } from '../../ports/logger';
import { ObtenerServiceUseCase } from './obtener-services';
import { errorCode } from '../../../domain/errors/errorCatalog';

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
    obtenerPorIdOSlug: overrides.obtenerPorIdOSlug ?? (async () => null),
    listarPaginado: async () => ({ items: [], nextCursor: undefined }),
  };
}

describe('ObtenerServiceUseCase', () => {
  it('lanza SERVICE_NOT_FOUND cuando el servicio no existe', async () => {
    const services = makeServices({
      obtenerPorIdOSlug: vi.fn().mockResolvedValue(null),
    });
    const logger = makeLogger();
    const useCase = new ObtenerServiceUseCase(services, logger);

    await expect(useCase.execute({ idOrSlug: 'no-existe', esPublico: true })).rejects.toMatchObject(
      { code: errorCode.serviceNotFound },
    );
  });

  it('devuelve el servicio cuando existe', async () => {
    const existente: ObtenerPorIdOSlugResult = {
      service: { ...fullService },
      esPublico: true,
    };
    const services = makeServices({
      obtenerPorIdOSlug: vi.fn().mockResolvedValue(existente),
    });
    const logger = makeLogger();
    const useCase = new ObtenerServiceUseCase(services, logger);

    const resultado = await useCase.execute({ idOrSlug: 's1', esPublico: true });

    expect(resultado).toEqual(existente);
  });

  it('reenvía includeHidden al repositorio', async () => {
    const existente: ObtenerPorIdOSlugResult = {
      service: { ...fullService, status: 'HIDDEN' },
      esPublico: true,
    };
    const services = makeServices({
      obtenerPorIdOSlug: vi.fn().mockResolvedValue(existente),
    });
    const logger = makeLogger();
    const useCase = new ObtenerServiceUseCase(services, logger);

    await useCase.execute({ idOrSlug: 's1', esPublico: true, includeHidden: true });

    expect(services.obtenerPorIdOSlug).toHaveBeenCalledWith('s1', true, true);
  });
});
