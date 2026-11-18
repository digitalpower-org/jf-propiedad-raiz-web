import type { Request, RequestHandler, Response } from 'express';
import { z } from 'zod';

import { ApiError } from '../../domain/errors/api-error';
import { errorCode } from '../../domain/errors/errorCatalog';

export interface UserIdentity {
  readonly uid: string;
  readonly role: 'admin';
  readonly email: string;
}

const identitySchema = z.object({
  'x-user-id': z.string().trim().min(1),
  'x-user-role': z.literal('admin'),
  'x-user-email': z.string().trim().email(),
});

function pickIdentityHeaders(req: Request): Record<string, string | undefined> {
  return {
    'x-user-id': req.header('x-user-id'),
    'x-user-role': req.header('x-user-role'),
    'x-user-email': req.header('x-user-email'),
  };
}

function toUserIdentity(data: z.infer<typeof identitySchema>): UserIdentity {
  return {
    uid: data['x-user-id'],
    role: data['x-user-role'],
    email: data['x-user-email'],
  };
}

export function setUserIdentity(res: Response, identity: UserIdentity | undefined): void {
  (res.locals as { userIdentity?: UserIdentity }).userIdentity = identity;
}

export function getUserIdentity(res: Response): UserIdentity | undefined {
  return (res.locals as { userIdentity?: UserIdentity }).userIdentity;
}

/**
 * Exige identidad de sesión de administrador en cabeceras propagadas por el BFF.
 * Ninguna cabecera es opcional: `X-User-Id`, `X-User-Role` (`admin`) y `X-User-Email`.
 */
export const requireUserIdentity: RequestHandler = (req, res, next) => {
  const parsed = identitySchema.safeParse(pickIdentityHeaders(req));

  if (!parsed.success) {
    const hasAny = Object.values(pickIdentityHeaders(req)).some(
      (value) => value !== undefined && value.trim() !== '',
    );
    if (!hasAny) {
      next(new ApiError(errorCode.unauthorized, 'Identidad de sesión requerida'));
      return;
    }
    next(new ApiError(errorCode.unauthorized, 'Identidad de sesión inválida o incompleta'));
    return;
  }

  setUserIdentity(res, toUserIdentity(parsed.data));
  next();
};

/**
 * Identidad de administrador opcional para rutas públicas que pueden incluir recursos `HIDDEN`.
 * - Sin cabeceras de identidad: continúa como anónimo.
 * - Con las 3 cabeceras válidas (rol admin): continúa con `res.locals.userIdentity`.
 * - Presencia parcial o inválida: rechaza con 401 para evitar ambigüedad.
 */
export const optionalAdminIdentity: RequestHandler = (req, res, next) => {
  const headers = pickIdentityHeaders(req);
  const hasAny = Object.values(headers).some(
    (value) => value !== undefined && String(value).trim() !== '',
  );

  if (!hasAny) {
    setUserIdentity(res, undefined);
    next();
    return;
  }

  const parsed = identitySchema.safeParse(headers);
  if (!parsed.success) {
    next(new ApiError(errorCode.unauthorized, 'Identidad de sesión inválida o incompleta'));
    return;
  }

  setUserIdentity(res, toUserIdentity(parsed.data));
  next();
};
