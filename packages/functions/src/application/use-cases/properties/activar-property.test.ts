import { describe, expect, it, vi } from 'vitest';

import type { ContentResource } from '../../revalidation/revalidate-content';
import { RevalidateContent } from '../../revalidation/revalidate-content';
import { ActivarPropertyUseCase } from './activar-property';

class FakeRevalidateContent extends RevalidateContent {
  override revalidate = vi.fn((_resource: ContentResource) =>
    Promise.resolve({ ok: true }),
  );

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

describe('ActivarPropertyUseCase', () => {
  it('llena properties.activate con el idOrSlug y dispara revalidación', async () => {
    const ports = makePorts();
    const useCase = new ActivarPropertyUseCase(
      ports.properties,
      ports.revalidateContent,
      ports.logger,
    );

    ports.properties.activate.mockResolvedValue({
      property: { codigo: 'JF-0001' },
      primeraActivacion: true,
      fechaPublicacion: '2026-01-15T10:00:00.000Z',
    });
    const resultado = await useCase.execute({ idOrSlug: 'doc-1' });

    expect(ports.properties.activate).toHaveBeenCalledWith('doc-1');
    expect(ports.revalidateContent.revalidate).toHaveBeenCalledWith(
      'propiedades',
    );
    expect(ports.logger.info).toHaveBeenCalledWith('property_activated', {
      idOrSlug: 'doc-1',
      primeraActivacion: resultado.primeraActivacion,
    });
  });

  it('propaga el error si properties.activate falla', async () => {
    const ports = makePorts();
    ports.properties.activate.mockRejectedValue(new Error('error_activando'));

    const useCase = new ActivarPropertyUseCase(
      ports.properties,
      ports.revalidateContent,
      ports.logger,
    );

    await expect(useCase.execute({ idOrSlug: 'doc-1' })).rejects.toThrow(
      'error_activando',
    );
  });
});
