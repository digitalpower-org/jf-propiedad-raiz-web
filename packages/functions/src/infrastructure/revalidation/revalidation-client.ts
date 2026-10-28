/**
 * RevalidationClient (MT1.4, AC0.3.1, AC0.3.3)
 *
 * Cliente en Firebase Functions para invocar `POST /api/revalidate`
 * en el BFF (Next.js en Firebase App Hosting).
 *
 * Envía el X-Internal-Key para autenticación server-to-server.
 * No revierte escrituras si la revalidación falla; solo registra (AC0.3.4).
 */

import type { Logger } from '../logging/logger';

export interface RevalidationClientConfig {
  readonly bffUrl: string; // ej. https://mi-proyecto.web.app o https://dominio.com
  readonly internalKey: string;
  readonly timeoutMs?: number;
  readonly logger: Logger;
}

export interface RevalidateRequest {
  readonly paths?: readonly string[];
  readonly tags?: readonly string[];
}

export interface RevalidateResponse {
  readonly success: boolean;
  readonly data?: {
    readonly revalidated: number;
    readonly failed: number;
    readonly errors: readonly string[];
  };
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: readonly unknown[];
    readonly requestId: string;
  };
}

export class RevalidationClient {
  private readonly bffUrl: string;
  private readonly internalKey: string;
  private readonly timeoutMs: number;
  private readonly logger: Logger;

  constructor(config: RevalidationClientConfig) {
    this.bffUrl = config.bffUrl.replace(/\/$/, '');
    this.internalKey = config.internalKey;
    this.timeoutMs = config.timeoutMs ?? 5_000;
    this.logger = config.logger;
  }

  /**
   * Revalida rutas y/o etiquetas en el BFF.
   * Devuelve true si la revalidación fue exitosa (o parcialmente exitosa),
   * false si falló completamente (error de red, 401, 5xx).
   *
   * AC0.3.4: Si la revalidación falla, la escritura no se revierte; solo se registra.
   */
  async revalidate(
    request: RevalidateRequest,
  ): Promise<{ ok: boolean; response?: RevalidateResponse }> {
    if (
      (!request.paths || request.paths.length === 0) &&
      (!request.tags || request.tags.length === 0)
    ) {
      this.logger.warn('revalidation_skipped', {
        requestId: this.logger.requestId,
        reason: 'empty_request',
      });
      return { ok: true };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.bffUrl}/api/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Key': this.internalKey,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let body: RevalidateResponse;
      try {
        body = (await response.json()) as RevalidateResponse;
      } catch {
        body = {
          success: false,
          error: {
            code: 'INVALID_RESPONSE',
            message: 'Respuesta no JSON del BFF',
            requestId: crypto.randomUUID(),
          },
        };
      }

      if (!response.ok) {
        this.logger.error('revalidation_failed', {
          requestId: this.logger.requestId,
          status: response.status,
          error: body.error,
        });
        return { ok: false, response: body };
      }

      if (!body.success) {
        this.logger.warn('revalidation_partial', {
          requestId: this.logger.requestId,
          data: body.data,
        });
        return { ok: true, response: body };
      }

      this.logger.info('revalidation_success', {
        requestId: this.logger.requestId,
        revalidated: body.data?.revalidated,
      });
      return { ok: true, response: body };
    } catch (err) {
      clearTimeout(timeoutId);
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('revalidation_error', {
        requestId: this.logger.requestId,
        error: message,
      });
      return { ok: false };
    }
  }
}

export function createRevalidationClient(config: RevalidationClientConfig): RevalidationClient {
  return new RevalidationClient(config);
}
