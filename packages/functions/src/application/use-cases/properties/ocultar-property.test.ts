import { describe, expect, it, vi } from 'vitest';

import type { ContentResource } from '../../revalidation/revalidate-content';
import { RevalidateContent } from '../../revalidation/revalidate-content';
import { OcultarPropertyUseCase } from './ocultar-property';

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

describe('OcultarPropertyUseCase', () => {
  it('llena properties.hide con el idOrSlug y dispara revalidación', async () => {
    const ports = makePorts();
    const useCase = new OcultarPropertyUseCase(
      ports.properties,
      ports.revalidateContent,
      ports.logger,
    );

    await useCase.execute({ idOrSlug: 'doc-1' });

    expect(ports.properties.hide).toHaveBeenCalledWith('doc-1');
    expect(ports.revalidateContent.revalidate).toHaveBeenCalledWith(
      'propiedades',
    );
    expect(ports.logger.info).toHaveBeenCalledWith('property_hidden', {
      idOrSlug: 'doc-1',
    });
  });
});
