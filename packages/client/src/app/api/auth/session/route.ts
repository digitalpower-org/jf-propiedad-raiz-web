// route.ts
// MT1.2: POST /api/auth/session - Canje de idToken de Firebase por JWT propio del BFF.
//
// Flujo:
// 1. Recibe Authorization: Bearer <idToken>
// 2. Reenvía al backend interno POST /internal/auth/verify con X-Internal-Key
// 3. Backend verifica idToken + lista blanca authorized_users
// 4. Si autorizado, BFF firma su propio JWT y establece cookie __session (HttpOnly)
// 5. Responde 200 con { success: true, data: { uid, email, role } }

import { NextResponse } from 'next/server';

import { backendUrl } from '@/server/backend-url';
import { bffRoute, errorEnvelope } from '@/server/bff-helper';
import { signSession } from '@/server/session/jwt';
import { env } from '@/server/config/server-config';

interface VerifyResponse {
  success: boolean;
  data?: {
    uid: string;
    email: string;
    role: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export const POST = bffRoute(async (request): Promise<NextResponse> => {
  // 1. Validar Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorEnvelope('UNAUTHORIZED', 'Se requiere Authorization: Bearer <idToken>', 401);
  }

  const idToken = authHeader.substring('Bearer '.length).trim();
  if (!idToken) {
    return errorEnvelope('UNAUTHORIZED', 'El idToken no puede estar vacío', 401);
  }

  // 2. Llamar al backend interno (3.1). La URL incluye el nombre de la función
  // exportada (`internalAuth`); nunca se resuelve sobre request.url porque eso
  // apuntaría a la propia app Next.js, no al backend.
  const internalKey = env.BFF_INTERNAL_KEY;
  const internalAuthUrl = backendUrl('/internal/auth/verify');

  // 3. Llamar al backend
  let backendResponse: Response;
  try {
    backendResponse = await fetch(internalAuthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': internalKey,
      },
      body: JSON.stringify({ idToken }),
    });
  } catch (err) {
    console.error('[SESSION] Error contacting backend:', err);
    return errorEnvelope('INTERNAL', 'Error de conexión con el backend', 500);
  }

  // 4. Procesar respuesta del backend
  let verifyData: VerifyResponse;
  try {
    verifyData = await backendResponse.json();
  } catch {
    return errorEnvelope('INTERNAL', 'Respuesta inválida del backend', 500);
  }

  // 5. Backend denegó (idToken inválido o fuera de lista blanca)
  if (!verifyData.success || !verifyData.data) {
    const code =
      verifyData.error?.code === 'PERMISSION_DENIED' ? 'PERMISSION_DENIED' : 'UNAUTHORIZED';
    return errorEnvelope(
      code,
      verifyData.error?.message ?? 'No autorizado',
      backendResponse.status,
    );
  }

  // 6. Backend autorizó: firmar JWT propio del BFF y establecer cookie
  const { uid, email, role } = verifyData.data;
  const sessionToken = signSession({ sub: uid, email, role });

  const response = NextResponse.json(
    {
      success: true,
      data: { uid, email, role },
      message: 'Sesión iniciada',
    },
    { status: 200 },
  );

  // Cookie HttpOnly, Secure, SameSite=Strict, Path=/, sin Domain (D33, AC1.2.1)
  const cookieAttributes = [
    `__session=${sessionToken}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${env.SESSION_TTL}`,
  ].join('; ');

  response.headers.set('Set-Cookie', cookieAttributes);
  response.headers.set('Cache-Control', 'no-store');

  return response;
});
