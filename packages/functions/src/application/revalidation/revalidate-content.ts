import type { Logger } from '../ports/logger';
import type { RevalidationGateway } from '../ports/revalidation-gateway';

export type ContentResource = 'propiedades' | 'servicios' | 'nosotros';

export interface ResourceRevalidation {
  readonly paths: readonly string[];
  readonly tags: readonly string[];
}

function resourceToRevalidation(resource: ContentResource): ResourceRevalidation {
  switch (resource) {
    case 'propiedades':
      return {
        paths: [
          '/es',
          '/en',
          '/es/venta',
          '/en/sale',
          '/es/alquiler',
          '/en/rent',
          '/es/proyectos',
          '/en/projects',
        ],
        tags: ['propiedades', 'listado', 'destacadas'],
      };
    case 'servicios':
      return {
        paths: ['/es/servicios', '/en/services'],
        tags: ['servicios'],
      };
    case 'nosotros':
      return {
        paths: ['/es/nosotros', '/en/about-us', '/es', '/en'],
        tags: ['nosotros', 'portada'],
      };
  }
}

export interface RevalidateContentDeps {
  readonly gateway: RevalidationGateway;
  readonly logger: Logger;
}

export class RevalidateContent {
  private readonly gateway: RevalidationGateway;
  private readonly logger: Logger;

  constructor(deps: RevalidateContentDeps) {
    this.gateway = deps.gateway;
    this.logger = deps.logger;
  }

  async revalidate(resource: ContentResource): Promise<{ ok: boolean }> {
    const mapping = resourceToRevalidation(resource);

    const result = await this.gateway.revalidate({
      paths: mapping.paths,
      tags: mapping.tags,
    });

    if (!result.ok) {
      this.logger.error('revalidation_failed', undefined, {
        resource,
        paths: mapping.paths,
        tags: mapping.tags,
      });
    }

    return { ok: result.ok };
  }
}
