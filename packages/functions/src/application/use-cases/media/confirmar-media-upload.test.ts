import { describe, expect, it, vi } from 'vitest';

import { ConfirmarMediaUploadUseCase } from './confirmar-media-upload';

function makePorts() {
  return {
    mediaStorage: {
      presignPut: vi.fn(),
      confirmarSubida: vi.fn(),
    },
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

describe('ConfirmarMediaUploadUseCase', () => {
  it('llena mediaStorage.confirmarSubida con key y recurso', async () => {
    const ports = makePorts();
    const useCase = new ConfirmarMediaUploadUseCase(ports.mediaStorage, ports.properties, ports.logger);

    ports.mediaStorage.confirmarSubida.mockResolvedValue({
      derivados: [{ clave: 'abc-123-320.webp', ancho: 320 }],
    });
    const resultado = await useCase.execute({
      key: 'pending/abc-123.jpg',
      recurso: 'foto',
    });

    expect(ports.mediaStorage.confirmarSubida).toHaveBeenCalledWith('pending/abc-123.jpg', 'foto');
    expect(ports.logger.info).toHaveBeenCalledWith('media_confirmed', {
      key: 'pending/abc-123.jpg',
      recurso: 'foto',
      derivados: resultado.derivados.length,
    });
  });

  it('propaga el error si mediaStorage.confirmarSubida falla', async () => {
    const ports = makePorts();
    ports.mediaStorage.confirmarSubida.mockRejectedValue(new Error('error_confirmando'));

    const useCase = new ConfirmarMediaUploadUseCase(ports.mediaStorage, ports.properties, ports.logger);

    await expect(useCase.execute({ key: 'pending/abc-123.jpg', recurso: 'foto' })).rejects.toThrow(
      'error_confirmando',
    );
  });

  it('vincula derivados de foto a la propiedad cuando existe', async () => {
    const ports = makePorts();
    ports.mediaStorage.confirmarSubida.mockResolvedValue({
      derivados: [{ clave: 'abc-123-320.webp', ancho: 320 }],
    });
    ports.properties.findByIdOrSlug.mockResolvedValue({
      property: { id: 'prop-1', fotos: [], panoramas: [] },
    });

    const useCase = new ConfirmarMediaUploadUseCase(ports.mediaStorage, ports.properties, ports.logger);

    await useCase.execute({
      key: 'pending/abc-123.jpg',
      recurso: 'foto',
      propertyId: 'prop-1',
    });

    expect(ports.properties.findByIdOrSlug).toHaveBeenCalledWith('prop-1', false);
    expect(ports.properties.update).toHaveBeenCalledWith('prop-1', {
      fotos: [{ derivados: [{ clave: 'abc-123-320.webp', ancho: 320 }] }],
    });
    expect(ports.logger.warn).not.toHaveBeenCalled();
  });

  it('vincula derivados de panorama a la propiedad cuando existe', async () => {
    const ports = makePorts();
    ports.mediaStorage.confirmarSubida.mockResolvedValue({
      derivados: [{ clave: 'abc-123-2048.webp', ancho: 2048 }],
    });
    ports.properties.findByIdOrSlug.mockResolvedValue({
      property: { id: 'prop-1', fotos: [], panoramas: [] },
    });

    const useCase = new ConfirmarMediaUploadUseCase(ports.mediaStorage, ports.properties, ports.logger);

    await useCase.execute({
      key: 'pending/abc-123.jpg',
      recurso: 'panorama',
      propertyId: 'prop-1',
    });

    expect(ports.properties.findByIdOrSlug).toHaveBeenCalledWith('prop-1', false);
    expect(ports.properties.update).toHaveBeenCalledWith('prop-1', {
      panoramas: [{ derivados: [{ clave: 'abc-123-2048.webp', ancho: 2048 }] }],
    });
  });

  it('no intenta vincular cuando no se provee propertyId', async () => {
    const ports = makePorts();
    ports.mediaStorage.confirmarSubida.mockResolvedValue({
      derivados: [{ clave: 'abc-123-320.webp', ancho: 320 }],
    });

    const useCase = new ConfirmarMediaUploadUseCase(ports.mediaStorage, ports.properties, ports.logger);

    await useCase.execute({
      key: 'pending/abc-123.jpg',
      recurso: 'foto',
    });

    expect(ports.properties.findByIdOrSlug).not.toHaveBeenCalled();
    expect(ports.properties.update).not.toHaveBeenCalled();
  });

  it('no actualiza y loguea warn cuando la propiedad no existe', async () => {
    const ports = makePorts();
    ports.mediaStorage.confirmarSubida.mockResolvedValue({
      derivados: [{ clave: 'abc-123-320.webp', ancho: 320 }],
    });
    ports.properties.findByIdOrSlug.mockResolvedValue(null);

    const useCase = new ConfirmarMediaUploadUseCase(ports.mediaStorage, ports.properties, ports.logger);

    await useCase.execute({
      key: 'pending/abc-123.jpg',
      recurso: 'foto',
      propertyId: 'prop-inexistente',
    });

    expect(ports.properties.findByIdOrSlug).toHaveBeenCalledWith('prop-inexistente', false);
    expect(ports.properties.update).not.toHaveBeenCalled();
    expect(ports.logger.warn).toHaveBeenCalledWith(
      'media_vinculacion_propiedad_no_encontrada',
      { propertyId: 'prop-inexistente' },
    );
  });

  it('agrega derivados a fotos existentes sin reemplazarlas', async () => {
    const ports = makePorts();
    ports.mediaStorage.confirmarSubida.mockResolvedValue({
      derivados: [{ clave: 'abc-456-640.webp', ancho: 640 }],
    });
    ports.properties.findByIdOrSlug.mockResolvedValue({
      property: {
        id: 'prop-1',
        fotos: [{ derivados: [{ clave: 'abc-123-320.webp', ancho: 320 }] }],
        panoramas: [],
      },
    });

    const useCase = new ConfirmarMediaUploadUseCase(ports.mediaStorage, ports.properties, ports.logger);

    await useCase.execute({
      key: 'pending/abc-456.jpg',
      recurso: 'foto',
      propertyId: 'prop-1',
    });

    expect(ports.properties.update).toHaveBeenCalledWith('prop-1', {
      fotos: [
        { derivados: [{ clave: 'abc-123-320.webp', ancho: 320 }] },
        { derivados: [{ clave: 'abc-456-640.webp', ancho: 640 }] },
      ],
    });
  });
});
