import { z } from 'zod';

import type { Logger } from '../../application/ports/logger';
import type {
  RevalidateRequest,
  RevalidateResponse,
  RevalidationGateway,
  RevalidationResult,
} from '../../application/ports/revalidation-gateway';

export interface RevalidationClientConfig {
  readonly bffUrl: string;
  readonly internalKey: string;
  readonly timeoutMs?: number;
  readonly logger: Logger;
}

const RevalidateResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      revalidated: z.number(),
      failed: z.number(),
      errors: z.array(z.string()),
    })
    .optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.array(z.unknown()).optional(),
      requestId: z.string(),
    })
    .optional(),
});

type ParsedResponse = z.infer<typeof RevalidateResponseSchema>;

function toResponse(input: ParsedResponse): RevalidateResponse {
  const { data, error } = input;
  return {
    success: input.success,
    ...(data !== undefined
      ? { data: { revalidated: data.revalidated, failed: data.failed, errors: data.errors } }
      : {}),
    ...(error !== undefined
      ? {
          error: {
            code: error.code,
            message: error.message,
            requestId: error.requestId,
            ...(error.details !== undefined ? { details: error.details } : {}),
          },
        }
      : {}),
  };
}

function invalidResponse(): RevalidateResponse {
  return {
    success: false,
    error: {
      code: 'INVALID_RESPONSE',
      message: 'Respuesta no válida del BFF',
      requestId: crypto.randomUUID(),
    },
  };
}

export class RevalidationClient implements RevalidationGateway {
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

  async revalidate(request: RevalidateRequest): Promise<RevalidationResult> {
    if (
      (!request.paths || request.paths.length === 0) &&
      (!request.tags || request.tags.length === 0)
    ) {
      this.logger.warn('revalidation_skipped', { reason: 'empty_request' });
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

      const parsed = RevalidateResponseSchema.safeParse(await response.json().catch(() => null));
      const body = parsed.success ? toResponse(parsed.data) : invalidResponse();

      if (!response.ok) {
        this.logger.error('revalidation_failed', undefined, {
          status: response.status,
          error: body.error,
        });
        return { ok: false, response: body };
      }

      if (!body.success) {
        this.logger.warn('revalidation_partial', { data: body.data });
        return { ok: true, response: body };
      }

      this.logger.info('revalidation_success', { revalidated: body.data?.revalidated });
      return { ok: true, response: body };
    } catch (error) {
      clearTimeout(timeoutId);
      this.logger.error('revalidation_error', error);
      return { ok: false };
    }
  }
}

export function createRevalidationClient(config: RevalidationClientConfig): RevalidationGateway {
  return new RevalidationClient(config);
}
