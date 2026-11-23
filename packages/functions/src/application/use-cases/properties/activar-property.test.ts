import { describe, expect, it, vi } from 'vitest';

import type { ContentResource } from '../../revalidation/revalidate-content';
import { RevalidateContent } from '../../revalidation/revalidate-content';
import { ActivarPropertyUseCase } from './activar-property';
import type { PropertyDto } from '../../ports/properties-repository';
import { errorCode } from '../../../domain/errors/errorCatalog';
import { errPropertyNotFound } from '../../../domain/errors/error-messages';

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

function makeCompleteProperty(): PropertyDto {
  return {
    id: 'doc-1',
    codigo: 'JF-0001',
    slug: 'casa-jf-0001',
    status: 'HIDDEN',
    operacion: 'VENTA',
    tipo: 'CASA',
    titulo: { es: 'Casa bonita' },
    precio: 200000000,
    departamento: 'Antioquia',
    municipio: 'Medellín',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    destacada: false,
    fotos: [{ derivados: [{ clave: 'foto1', ancho: 800, alto: 600 }] }],
  };
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

describe('ActivarPropertyUseCase', () => {
  it('llena properties.activate con el idOrSlug y dispara revalidación', async () => {
    const ports = makePorts();
    const useCase = new ActivarPropertyUseCase(
      ports.properties,
      ports.revalidateContent,
      ports.logger,
    );

    // Mock findByIdOrSlug to return a complete property
    ports.properties.findByIdOrSlug.mockResolvedValue({
      property: makeCompleteProperty(),
      esPublico: false,
    });
    ports.properties.activate.mockResolvedValue({
      property: { ...makeCompleteProperty(), status: 'ACTIVE' },
      primeraActivacion: true,
      fechaPublicacion: '2026-01-15T10:00:00.000Z',
    });
    const resultado = await useCase.execute({ idOrSlug: 'doc-1' });

    expect(ports.properties.findByIdOrSlug).toHaveBeenCalledWith('doc-1', false, true);
    expect(ports.properties.activate).toHaveBeenCalledWith('doc-1');
    expect(ports.revalidateContent.revalidate).toHaveBeenCalledWith('propiedades');
    expect(ports.logger.info).toHaveBeenCalledWith('property_activated', {
      idOrSlug: 'doc-1',
      primeraActivacion: resultado.primeraActivacion,
    });
  });

  it('lanza PROPERTY_NOT_FOUND cuando el inmueble no existe', async () => {
    const ports = makePorts();
    ports.properties.findByIdOrSlug.mockResolvedValue(null);
    const useCase = new ActivarPropertyUseCase(
      ports.properties,
      ports.revalidateContent,
      ports.logger,
    );

    await expect(useCase.execute({ idOrSlug: 'inexistente' })).rejects.toMatchObject({
      name: 'ApiError',
      code: errorCode.propertyNotFound,
      message: errPropertyNotFound('inexistente'),
    });
  });

  it('propaga el error si properties.activate falla', async () => {
    const ports = makePorts();
    ports.properties.findByIdOrSlug.mockResolvedValue({
      property: makeCompleteProperty(),
      esPublico: false,
    });
    ports.properties.activate.mockRejectedValue(new Error('error_activando'));

    const useCase = new ActivarPropertyUseCase(
      ports.properties,
      ports.revalidateContent,
      ports.logger,
    );

    await expect(useCase.execute({ idOrSlug: 'doc-1' })).rejects.toThrow('error_activando');
  });

  it('rechaza con 422 cuando el inmueble está incompleto', async () => {
    const ports = makePorts();
    const useCase = new ActivarPropertyUseCase(
      ports.properties,
      ports.revalidateContent,
      ports.logger,
    );

    // Mock findByIdOrSlug to return an incomplete property (no fotos)
    ports.properties.findByIdOrSlug.mockResolvedValue({
      property: {
        ...makeCompleteProperty(),
        fotos: [],
      },
      esPublico: false,
    });

    await expect(useCase.execute({ idOrSlug: 'doc-1' })).rejects.toThrow(
      'Campos obligatorios para activar',
    );
  });

  it('rechaza con 409 cuando el inmueble está DELETED', async () => {
    const ports = makePorts();
    const useCase = new ActivarPropertyUseCase(
      ports.properties,
      ports.revalidateContent,
      ports.logger,
    );

    ports.properties.findByIdOrSlug.mockResolvedValue({
      property: {
        ...makeCompleteProperty(),
        status: 'DELETED',
      },
      esPublico: false,
    });

    await expect(useCase.execute({ idOrSlug: 'doc-1' })).rejects.toThrow(
      'El inmueble está eliminado y no puede activarse',
    );
  });
});
