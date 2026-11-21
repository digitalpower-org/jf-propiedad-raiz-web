import { describe, expect, it, vi } from 'vitest';

import type { ServiceDto, ServiciosRepository } from '../../ports/services-repository';
import type { MediaStorage } from '../../ports/media-storage';
import type { Logger } from '../../ports/logger';
import { RevalidateContent } from '../../revalidation/revalidate-content';
import { EliminarServiceUseCase } from './eliminar-services';

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
    eliminar: overrides.eliminar ?? (async () => ({ service: fullService })),
    activar: async () => ({ service: fullService }),
    ocultar: async () => ({ service: fullService }),
    reordenar: async () => {},
    obtenerPorIdOSlug: async () => null,
    listarPaginado: async () => ({ items: [], nextCursor: undefined }),
  };
}

describe('EliminarServiceUseCase', () => {
  it('elimina servicio, purga derivados de fotos y revalida servicios', async () => {
    const services = makeServices({
      eliminar: vi.fn().mockResolvedValue({
        service: {
          id: 's1',
          slug: 'servicio-de-arquitectura',
          fotos: [{ derivados: [{ clave: 'foto-vieja' }] }],
        },
      }),
    });
    const revalidateContent = new RevalidateContent({
      gateway: { revalidate: async () => ({ ok: true }) },
      logger: makeLogger(),
    });
    revalidateContent.revalidate = vi.fn().mockResolvedValue({ ok: true });
    const mediaStorage = makeMediaStorage();
    const logger = makeLogger();
    const useCase = new EliminarServiceUseCase({
      services,
      revalidateContent,
      mediaStorage,
      logger,
    });

    const resultado = await useCase.execute({
      idOrSlug: 'servicio-de-arquitectura',
      requestId: 'req-1',
    });

    expect(services.eliminar).toHaveBeenCalledWith('servicio-de-arquitectura');
    expect(mediaStorage.deleteDerivados).toHaveBeenCalledWith(['foto-vieja'], 'foto');
    expect(revalidateContent.revalidate).toHaveBeenCalledWith('servicios');
    expect(resultado).toEqual({ service: { id: 's1', slug: 'servicio-de-arquitectura' } });
  });

  it('no purga derivados cuando no hay fotos y revalida servicios', async () => {
    const services = makeServices({
      eliminar: vi
        .fn()
        .mockResolvedValue({ service: { id: 's1', slug: 'servicio-de-arquitectura' } }),
    });
    const revalidateContent = new RevalidateContent({
      gateway: { revalidate: async () => ({ ok: true }) },
      logger: makeLogger(),
    });
    revalidateContent.revalidate = vi.fn().mockResolvedValue({ ok: true });
    const mediaStorage = makeMediaStorage();
    const logger = makeLogger();
    const useCase = new EliminarServiceUseCase({
      services,
      revalidateContent,
      mediaStorage,
      logger,
    });

    await useCase.execute({ idOrSlug: 'servicio-de-arquitectura', requestId: 'req-1' });

    expect(mediaStorage.deleteDerivados).not.toHaveBeenCalled();
    expect(revalidateContent.revalidate).toHaveBeenCalledWith('servicios');
  });
});
