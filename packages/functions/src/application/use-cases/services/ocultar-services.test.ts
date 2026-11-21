import { describe, expect, it, vi } from 'vitest';

import type { ServiceDto, ServiciosRepository } from '../../ports/services-repository';
import type { MediaStorage } from '../../ports/media-storage';
import type { Logger } from '../../ports/logger';
import { RevalidateContent } from '../../revalidation/revalidate-content';
import { OcultarServiceUseCase } from './ocultar-services';

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
    ocultar: overrides.ocultar ?? (async () => ({ service: fullService })),
    reordenar: async () => {},
    obtenerPorIdOSlug: async () => null,
    listarPaginado: async () => ({ items: [], nextCursor: undefined }),
  };
}

describe('OcultarServiceUseCase', () => {
  it('oculta servicio y revalida servicios', async () => {
    const services = makeServices({
      ocultar: vi.fn().mockResolvedValue({ service: fullService }),
    });
    const revalidateContent = new RevalidateContent({
      gateway: { revalidate: async () => ({ ok: true }) },
      logger: makeLogger(),
    });
    revalidateContent.revalidate = vi.fn().mockResolvedValue({ ok: true });
    const mediaStorage = makeMediaStorage();
    const logger = makeLogger();
    const useCase = new OcultarServiceUseCase({
      services,
      revalidateContent,
      mediaStorage,
      logger,
    });

    const resultado = await useCase.execute({ idOrSlug: 's1', requestId: 'req-1' });

    expect(services.ocultar).toHaveBeenCalledWith('s1');
    expect(revalidateContent.revalidate).toHaveBeenCalledWith('servicios');
    expect(resultado).toEqual({ service: { id: 's1' } });
  });
});
