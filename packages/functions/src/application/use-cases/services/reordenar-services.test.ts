import { describe, expect, it, vi } from 'vitest';

import type { ServiceDto, ServiciosRepository } from '../../ports/services-repository';
import type { MediaStorage } from '../../ports/media-storage';
import type { Logger } from '../../ports/logger';
import { RevalidateContent } from '../../revalidation/revalidate-content';
import { ReordenarServiceUseCase } from './reordenar-services';

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
    reordenar: overrides.reordenar ?? (async () => {}),
    obtenerPorIdOSlug: async () => null,
    listarPaginado: async () => ({ items: [], nextCursor: undefined }),
  };
}

describe('ReordenarServiceUseCase', () => {
  it('reordena servicios y revalida servicios', async () => {
    const services = makeServices({
      reordenar: vi.fn().mockResolvedValue(undefined),
    });
    const revalidateContent = new RevalidateContent({
      gateway: { revalidate: async () => ({ ok: true }) },
      logger: makeLogger(),
    });
    revalidateContent.revalidate = vi.fn().mockResolvedValue({ ok: true });
    const mediaStorage = makeMediaStorage();
    const logger = makeLogger();
    const useCase = new ReordenarServiceUseCase({
      services,
      revalidateContent,
      mediaStorage,
      logger,
    });

    const items = [
      { id: 's1', orden: 1 },
      { id: 's2', orden: 2 },
    ];

    await useCase.execute({ items, requestId: 'req-1' });

    expect(services.reordenar).toHaveBeenCalledWith(items);
    expect(revalidateContent.revalidate).toHaveBeenCalledWith('servicios');
  });
});
