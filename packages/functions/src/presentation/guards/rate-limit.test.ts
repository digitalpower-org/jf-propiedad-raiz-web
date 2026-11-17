import { describe, expect, it, vi } from 'vitest';

import { RateLimitedError } from '../../application/ports/rate-limiter';
import type { Logger } from '../../application/ports/logger';
import { ApiError } from '../../domain/errors/api-error';
import { errorCode } from '../../domain/errors/errorCatalog';
import {
  clientIpKey,
  fallbackClientIpKey,
  fixedKey,
  identityKey,
  makeFailOpenRateLimitGuard,
  makeRateLimitGuard,
  socketIpKey,
  type RateLimitConfig,
  type RateLimitRequest,
  type RateLimitResponse,
} from './rate-limit';

function makeLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function makeRateLimiter() {
  const check = vi.fn<(key: string, limit: number, windowSeconds: number) => Promise<void>>();
  return { check };
}

function baseConfig(overrides: Partial<RateLimitConfig> = {}): RateLimitConfig {
  return {
    name: 'test-guard',
    keyFrom: fixedKey('clave-fija'),
    limit: 10,
    windowSeconds: 60,
    message: 'Demasiadas solicitudes',
    ...overrides,
  };
}

function makeReqRes(
  reqOverrides: Partial<RateLimitRequest> = {},
  resOverrides: Partial<RateLimitResponse> = {},
) {
  const req: RateLimitRequest = {
    header: vi.fn(),
    ip: undefined,
    ...reqOverrides,
  };
  const res: RateLimitResponse = {
    locals: {},
    ...resOverrides,
  };
  return { req, res };
}

describe('makeRateLimitGuard (fail-close)', () => {
  it('llama rateLimiter.check con clave, límite y ventana exactos', async () => {
    const rateLimiter = makeRateLimiter();
    rateLimiter.check.mockResolvedValue(undefined);
    const guard = makeRateLimitGuard(rateLimiter, makeLogger(), baseConfig());
    const { req, res } = makeReqRes();
    const next = vi.fn();

    await guard(req, res, next);

    expect(rateLimiter.check).toHaveBeenCalledWith('clave-fija', 10, 60);
    expect(next).toHaveBeenCalledWith();
  });

  it('RateLimitedError → next con ApiError(RATE_LIMITED, message)', async () => {
    const rateLimiter = makeRateLimiter();
    rateLimiter.check.mockRejectedValue(new RateLimitedError('límite excedido'));
    const guard = makeRateLimitGuard(rateLimiter, makeLogger(), baseConfig());
    const { req, res } = makeReqRes();
    const next = vi.fn();

    await guard(req, res, next);

    expect(next).toHaveBeenCalledWith(
      new ApiError(errorCode.rateLimited, 'Demasiadas solicitudes'),
    );
  });

  it('fallo de infraestructura: logger.error y next con ApiError (429)', async () => {
    const error = new Error('firestore caído');
    const rateLimiter = makeRateLimiter();
    rateLimiter.check.mockRejectedValue(error);
    const logger = makeLogger();
    const guard = makeRateLimitGuard(rateLimiter, logger, baseConfig());
    const { req, res } = makeReqRes({}, { locals: { requestId: 'req-1' } });
    const next = vi.fn();

    await guard(req, res, next);

    expect(logger.error).toHaveBeenCalledWith(
      'rate_limiter_unavailable',
      error,
      expect.objectContaining({ guard: 'test-guard', requestId: 'req-1' }),
    );
    expect(next).toHaveBeenCalledWith(
      new ApiError(errorCode.rateLimited, 'Demasiadas solicitudes'),
    );
  });
});

describe('makeFailOpenRateLimitGuard (fail-open)', () => {
  it('fallo de infraestructura: logger.warn y next() sin error', async () => {
    const error = new Error('firestore caído');
    const rateLimiter = makeRateLimiter();
    rateLimiter.check.mockRejectedValue(error);
    const logger = makeLogger();
    const guard = makeFailOpenRateLimitGuard(rateLimiter, logger, baseConfig());
    const { req, res } = makeReqRes({}, { locals: { requestId: 'req-1' } });
    const next = vi.fn();

    await guard(req, res, next);

    expect(logger.warn).toHaveBeenCalledWith(
      'rate_limiter_unavailable',
      expect.objectContaining({ guard: 'test-guard', requestId: 'req-1' }),
    );
    expect(next).toHaveBeenCalledWith();
  });

  it('RateLimitedError sigue respondiendo 429 incluso en fail-open', async () => {
    const rateLimiter = makeRateLimiter();
    rateLimiter.check.mockRejectedValue(new RateLimitedError('límite excedido'));
    const guard = makeFailOpenRateLimitGuard(rateLimiter, makeLogger(), baseConfig());
    const { req, res } = makeReqRes();
    const next = vi.fn();

    await guard(req, res, next);

    expect(next).toHaveBeenCalledWith(
      new ApiError(errorCode.rateLimited, 'Demasiadas solicitudes'),
    );
  });
});

describe('extractores de clave', () => {
  it('fixedKey devuelve la clave fija sin inspeccionar req/res', () => {
    const extractor = fixedKey('internal-auth-verify');
    const { req, res } = makeReqRes();
    expect(extractor(req, res)).toBe('internal-auth-verify');
  });

  it('clientIpKey usa solo x-client-ip crudo', () => {
    const { req } = makeReqRes({ header: vi.fn().mockReturnValue('1.2.3.4') });
    expect(clientIpKey(req)).toBe('1.2.3.4');
  });

  it('clientIpKey devuelve cadena vacía sin x-client-ip', () => {
    const { req } = makeReqRes({ header: vi.fn().mockReturnValue(undefined) });
    expect(clientIpKey(req)).toBe('');
  });

  it('fallbackClientIpKey prefiere x-client-ip', () => {
    const { req } = makeReqRes({
      header: vi.fn().mockReturnValue('1.2.3.4'),
      ip: '5.6.7.8',
    });
    expect(fallbackClientIpKey(req)).toBe('1.2.3.4');
  });

  it('fallbackClientIpKey cae a req.ip', () => {
    const { req } = makeReqRes({
      header: vi.fn().mockReturnValue(undefined),
      ip: '5.6.7.8',
    });
    expect(fallbackClientIpKey(req)).toBe('5.6.7.8');
  });

  it('fallbackClientIpKey cae a unknown', () => {
    const { req } = makeReqRes({ header: vi.fn().mockReturnValue(undefined) });
    expect(fallbackClientIpKey(req)).toBe('unknown');
  });

  it('socketIpKey usa req.ip', () => {
    const { req } = makeReqRes({ ip: '5.6.7.8' });
    expect(socketIpKey(req)).toBe('5.6.7.8');
  });

  it('socketIpKey devuelve unknown sin req.ip', () => {
    const { req } = makeReqRes({ header: vi.fn() });
    expect(socketIpKey(req)).toBe('unknown');
  });

  it('identityKey usa uid de res.locals.userIdentity', () => {
    const extractor = identityKey('app');
    const { req, res } = makeReqRes(
      {},
      {
        locals: { userIdentity: { uid: 'uid-1', role: 'admin', email: 'a@b.com' } },
      },
    );
    expect(extractor(req, res)).toBe('app:uid-1');
  });

  it('identityKey usa el prefijo cuando no hay uid', () => {
    const extractor = identityKey('app');
    const { req, res } = makeReqRes();
    expect(extractor(req, res)).toBe('app:app');
  });
});
