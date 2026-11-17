/**
 * Guards de límite de velocidad (rate limit) para rutas públicas (US3.4).
 *
 * Exporta dos factories explícitas (sin parámetros booleanos de control):
 * - `makeRateLimitGuard`: fail-close. Ante fallo de infraestructura responde 429.
 * - `makeFailOpenRateLimitGuard`: fail-open. Solo para `/health`; ante fallo llama `next()`.
 *
 * Ambos llaman `rateLimiter.check(keyFrom(req, res), limit, windowSeconds)` y, ante
 * `RateLimitedError`, reenvían `next(new ApiError(RATE_LIMITED, message))` para que el
 * middleware de errores mapee a 429.
 *
 * Los extractores de clave trabajan sobre tipos mínimos de req/res para que los tests
 * no necesiten casts de Express.
 */

import type { NextFunction } from 'express';

import { RateLimiter, RateLimitedError } from '../../application/ports/rate-limiter';
import type { Logger } from '../../application/ports/logger';
import { ApiError } from '../../domain/errors/api-error';
import { errorCode } from '../../domain/errors/errorCatalog';
import type { UserIdentity } from './user-identity';

/** Subconjunto mínimo de Express.Request que consumen los extractores de clave. */
export interface RateLimitRequest {
  readonly header: (name: string) => string | undefined;
  readonly ip?: string;
  readonly path?: string;
}

/** Subconjunto mínimo de Express.Response que consumen los extractores de clave. */
export interface RateLimitResponse {
  readonly locals: Record<string, unknown> & { readonly userIdentity?: UserIdentity };
}

export interface RateLimitConfig {
  readonly name: string;
  readonly keyFrom: (req: RateLimitRequest, res: RateLimitResponse) => string;
  readonly limit: number;
  readonly windowSeconds: number;
  readonly message: string;
}

export type RateLimitHandler = (
  req: RateLimitRequest,
  res: RateLimitResponse,
  next: NextFunction,
) => void | Promise<void>;

function getRequestId(res: RateLimitResponse): string {
  return String(res.locals.requestId ?? '');
}

/**
 * Fail-close: ante fallo de infraestructura del rate limiter registra `error` y
 * reenvía un `ApiError(RATE_LIMITED)` que el middleware mapea a 429. Nunca deja pasar
 * una solicitud cuando el limitador no está disponible.
 */
export function makeRateLimitGuard(
  rateLimiter: RateLimiter,
  logger: Logger,
  config: RateLimitConfig,
): RateLimitHandler {
  return async (req, res, next) => {
    const requestId = getRequestId(res);
    try {
      await rateLimiter.check(config.keyFrom(req, res), config.limit, config.windowSeconds);
      next();
      return;
    } catch (error) {
      if (error instanceof RateLimitedError) {
        next(new ApiError(errorCode.rateLimited, config.message));
        return;
      }
      logger.error('rate_limiter_unavailable', error, {
        guard: config.name,
        requestId,
      });
      next(new ApiError(errorCode.rateLimited, config.message));
      return;
    }
  };
}

/**
 * Fail-open: solo para `/health`. Ante fallo de infraestructura registra una advertencia
 * y llama `next()` para no bloquear el health check. Ante `RateLimitedError` sigue
 * respondiendo 429 como cualquier otro guard.
 */
export function makeFailOpenRateLimitGuard(
  rateLimiter: RateLimiter,
  logger: Logger,
  config: RateLimitConfig,
): RateLimitHandler {
  return async (req, res, next) => {
    const requestId = getRequestId(res);
    try {
      await rateLimiter.check(config.keyFrom(req, res), config.limit, config.windowSeconds);
      next();
      return;
    } catch (error) {
      if (error instanceof RateLimitedError) {
        next(new ApiError(errorCode.rateLimited, config.message));
        return;
      }
      logger.warn('rate_limiter_unavailable', {
        guard: config.name,
        requestId,
      });
      next();
      return;
    }
  };
}

/** Devuelve siempre la misma clave, sin inspeccionar la petición. */
export function fixedKey(key: string): (req: RateLimitRequest, res: RateLimitResponse) => string {
  return () => key;
}

/** Clave a partir de la cabecera `x-client-ip` cruda, sin fallback. */
export function clientIpKey(req: RateLimitRequest): string {
  return req.header('x-client-ip') ?? '';
}

/** Clave pública que aísla buckets por ruta y, si hay cliente, por IP. */
export function publicReadKey(req: RateLimitRequest): string {
  const path = req.path ?? 'unknown';
  const clientIp = req.header('x-client-ip');
  return clientIp ? `client:${path}:${clientIp}` : `ssr:${path}`;
}

/** Clave a partir de `req.ip`, con fallback `'unknown'`. */
export function socketIpKey(req: RateLimitRequest): string {
  return req.ip ?? 'unknown';
}

/**
 * Clave a partir de la identidad de usuario en `res.locals.userIdentity` (la misma
 * fuente que lee `getUserIdentity`): `${prefix}:${uid ?? prefix}`.
 */
export function identityKey(
  prefix: string,
): (req: RateLimitRequest, res: RateLimitResponse) => string {
  return (_req, res) => {
    const identity = res.locals.userIdentity;
    const uid = identity?.uid;
    return `${prefix}:${uid ?? prefix}`;
  };
}
