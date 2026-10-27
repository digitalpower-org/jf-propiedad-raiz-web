// jwt.ts
// Módulo de verificación del JWT de sesión BFF (D34)
// Firma HS256, claims, validaciones de temporalidad e invariantes.

import { type NextRequest } from 'next/server';
import crypto from 'crypto';
import { env } from '@/server/config/server-config';

export interface SessionClaims {
  readonly sub: string; // UID de Firebase Auth
  readonly email: string; // correo verificado
  readonly role: string; // siempre "admin" en v1
  readonly iss: string; // emisor fijo
  readonly aud: string; // audiencia fija
  readonly iat: number; // emitido en segundos
  readonly exp: number; // expira en segundos
}

export const SESSION_JWT_SECRET = env.SESSION_JWT_SECRET;
export const SESSION_JWT_SECRET_PREVIOUS = env.SESSION_JWT_SECRET_PREVIOUS;
export const SESSION_TTL = 3900; // 65 min en segundos (D34)
export const SESSION_SKEW = 60; // 60 segundos de tolerancia (D34)
export const SESSION_ISS = 'jf-bff';
export const SESSION_AUD = 'jf-web';

export function signSession(claims: Pick<SessionClaims, 'sub' | 'email' | 'role'>): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionClaims = {
    sub: claims.sub,
    email: claims.email,
    role: claims.role,
    iss: SESSION_ISS,
    aud: SESSION_AUD,
    iat: now,
    exp: now + SESSION_TTL,
  };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_JWT_SECRET)
    .update(header + '.' + body)
    .digest('base64url');

  return header + '.' + body + '.' + signature;
}

export function verifySession(cookie: string): SessionClaims | null {
  // D34: Validaciones en el orden especificado, tolerancia de errores uniforme

  // 1. Un único valor de cookie (la llamada ya validó este punto antes de llegar aquí)

  // 2. Tamaño ≤ 4 KB
  if (cookie.length > 4096) {
    logUnverified('SESSION_ERROR', 'JWT_TOO_LARGE');
    return null;
  }

  // 3. JWT bien formado con exactamente 3 segmentos base64url válidos
  const parts = cookie.split('.');
  if (parts.length !== 3) {
    logUnverified('SESSION_ERROR', 'JWT_MALFORMED');
    return null;
  }

  const [headerB64, bodyB64, signatureB64] = parts;

  // Safety check - all segments should exist since we validated parts.length === 3
  if (!headerB64 || !bodyB64 || !signatureB64) {
    logUnverified('SESSION_ERROR', 'JWT_MISSING_SEGMENTS');
    return null;
  }

  const base64urlRegex = /^[A-Za-z0-9_-]+$/;
  if (
    !base64urlRegex.test(headerB64) ||
    !base64urlRegex.test(bodyB64) ||
    !base64urlRegex.test(signatureB64)
  ) {
    logUnverified('SESSION_ERROR', 'JWT_INVALID_BASE64URL');
    return null;
  }

  let headerJson: unknown;
  let bodyJson: unknown;
  try {
    headerJson = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    bodyJson = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8'));
  } catch {
    logUnverified('SESSION_ERROR', 'JWT_INVALID_JSON');
    return null;
  }

  interface JwtHeader {
    alg: string;
    typ: string;
  }

  const header = headerJson as Partial<JwtHeader>;

  // 4. alg exactamente HS256 (se rechazan none, RS256, HS384, etc.)
  if (!header || header.alg !== 'HS256' || header.typ !== 'JWT') {
    logUnverified('SESSION_ERROR', 'JWT_ALG_MISMATCH');
    return null;
  }

  // 5. Firma HMAC válida con comparación en tiempo constante
  const expectedSignature = crypto
    .createHmac('sha256', SESSION_JWT_SECRET)
    .update(headerB64 + '.' + bodyB64)
    .digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signatureB64), Buffer.from(expectedSignature))) {
    // Intentar con el secreto anterior si existe
    if (SESSION_JWT_SECRET_PREVIOUS) {
      const expectedSignaturePrevious = crypto
        .createHmac('sha256', SESSION_JWT_SECRET_PREVIOUS)
        .update(headerB64 + '.' + bodyB64)
        .digest('base64url');
      if (
        crypto.timingSafeEqual(Buffer.from(signatureB64), Buffer.from(expectedSignaturePrevious))
      ) {
        return verifySessionWithBody(bodyJson, true); // true = used previous secret
      }
    }

    logUnverified('SESSION_ERROR', 'JWT_BAD_SIGNATURE');
    return null;
  }

  return verifySessionWithBody(bodyJson, false);
}

function verifySessionWithBody(body: unknown, usedPreviousSecret: boolean): SessionClaims | null {
  // Validar claims según D34

  if (!body || typeof body !== 'object' || body === null) {
    logUnverified('SESSION_ERROR', 'JWT_INVALID_CLAIMS');
    return null;
  }

  const claims = body as Partial<Record<keyof SessionClaims, unknown>>;

  // 6. iss / aud esperados
  if (claims.iss !== SESSION_ISS || claims.aud !== SESSION_AUD) {
    logUnverified('SESSION_ERROR', 'JWT_ISS_AUD_MISMATCH');
    return null;
  }

  // 7. sub/email/role presentes y non-empty string
  if (
    !claims.sub ||
    typeof claims.sub !== 'string' ||
    claims.sub === '' ||
    !claims.email ||
    typeof claims.email !== 'string' ||
    claims.email === '' ||
    !claims.role ||
    typeof claims.role !== 'string' ||
    claims.role === ''
  ) {
    logUnverified('SESSION_ERROR', 'JWT_MISSING_CLAIMS');
    return null;
  }

  // Validar tipos (sub debe ser string, role debe ser string)

  // 8. iat / exp numéricos (segundos)
  const iat = claims.iat as number;
  const exp = claims.exp as number;
  if (!Number.isInteger(iat) || !Number.isInteger(exp) || iat < 0 || exp < 0) {
    logUnverified('SESSION_ERROR', 'JWT_NON_INTEGER_TIMESTAMPS');
    return null;
  }

  // 9. iat ≤ now + 60 s, exp ≥ now - 60 s
  const now = Math.floor(Date.now() / 1000);
  if (iat > now + SESSION_SKEW) {
    logUnverified('SESSION_ERROR', 'JWT_IAT_FUTURE');
    return null;
  }

  if (exp < now - SESSION_SKEW) {
    logUnverified('SESSION_ERROR', 'JWT_EXP_PAST');
    return null;
  }

  // 10. iat ≤ exp y exp − iat = 3900 s (D34)
  if (iat > exp) {
    logUnverified('SESSION_ERROR', 'JWT_IAT_AFTER_EXP');
    return null;
  }

  const diff = exp - iat;
  if (diff !== SESSION_TTL) {
    logUnverified('SESSION_ERROR', 'JWT_TTL_MISMATCH');
    return null;
  }

  // Limpiar `nbf` si aparece, ignorarlo (no lo emitimos)

  // Éxito: devolver claims validados
  const validatedClaims: SessionClaims = {
    sub: claims.sub,
    email: claims.email,
    role: claims.role,
    iss: claims.iss,
    aud: claims.aud,
    iat,
    exp,
  };

  logVerified(`JWT_VALID`, {
    email: validatedClaims.email,
    role: validatedClaims.role,
    usedPreviousSecret,
    iat: validatedClaims.iat,
    exp: validatedClaims.exp,
  });

  return validatedClaims;
}

function logUnverified(reason: string, details?: string): void {
  console.log(`[SESSION_UNVERIFIED] ${reason}: ${details ?? ''}`);
  // TODO: Log con requestId para trazabilidad (AC0.1.2)
}

function logVerified(reason: string, details: unknown): void {
  console.log(`[SESSION_VERIFIED] ${reason}: ${JSON.stringify(details, null, 2)}`);
}

export async function extractSessionFromCookie(
  request: NextRequest,
): Promise<SessionClaims | null> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith('__session='));
  if (!sessionCookie) return null;

  const value = sessionCookie.substring('__session='.length);

  // Rechazar múltiples valores de __session (la llamada externa debe validar esto primero)
  const otherSession = cookies.find((c) => c.startsWith('__session=') && c !== sessionCookie);
  if (otherSession) {
    logUnverified('SESSION_ERROR', 'MULTIPLE_SESSION_COOKIES');
    return null;
  }

  return verifySession(value);
}
