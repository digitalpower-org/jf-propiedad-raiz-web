// Revalidate content (5.4)
// Mapea un recurso de dominio a los { paths, tags } que Next.js debe
// revalidar tras una escritura. Llama al RevalidationClient existente.
// Se invoca desde MT2.1 (después de validar → traducir → escribir → revalidar).

import type { Logger } from '../../infrastructure/logging/logger';
import {
  createRevalidationClient,
  type RevalidationClientConfig,
} from '../../infrastructure/revalidation/revalidation-client';

export type ContentResource = 'propiedades' | 'servicios' | 'nosotros';

export interface ResourceRevalidation {
  readonly paths: readonly string[];
  readonly tags: readonly string[];
}

/**
 * Mapea cada recurso de dominio a las rutas y etiquetas de Next.js que
 * deben revalidarse cuando se escribe ese recurso.
 */
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
  readonly client: ReturnType<typeof createRevalidationClient>;
  readonly logger: Logger;
}

export class RevalidateContent {
  private readonly client: ReturnType<typeof createRevalidationClient>;
  private readonly logger: Logger;

  constructor(deps: RevalidateContentDeps) {
    this.client = deps.client;
    this.logger = deps.logger;
  }

  /**
   * Revalida las rutas y etiquetas asociadas a un recurso tras una escritura.
   * AC0.3.4: si la revalidación falla, la escritura no se revierte; solo se registra.
   */
  async revalidate(resource: ContentResource): Promise<{ ok: boolean }> {
    const mapping = resourceToRevalidation(resource);

    const result = await this.client.revalidate({
      paths: mapping.paths,
      tags: mapping.tags,
    });

    if (!result.ok) {
      this.logger.error('revalidation_failed', {
        requestId: this.logger.requestId,
        resource,
        paths: mapping.paths,
        tags: mapping.tags,
      });
    }

    return { ok: result.ok };
  }
}

export function createRevalidateContent(
  config: RevalidationClientConfig,
  logger: Logger,
): RevalidateContent {
  return new RevalidateContent({
    client: createRevalidationClient(config),
    logger,
  });
}
