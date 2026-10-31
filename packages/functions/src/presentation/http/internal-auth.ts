import { onRequest } from 'firebase-functions/v1/https';
import { getAuth } from 'firebase-admin/auth';
import crypto from 'crypto';
import { getAdminApp } from '../../infrastructure/firebase/admin';
import { findAuthorizedUser } from '../../infrastructure/auth/authorized-users';
import { safeEqual } from '../../infrastructure/crypto/safe-equal';

const auth = getAuth(getAdminApp());

export const internalAuth = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      data: { code: 'METHOD_NOT_ALLOWED', details: [], requestId: crypto.randomUUID() },
      message: 'Método no permitido',
    });
    return;
  }

  const internalKey = (req.headers['x-internal-key'] as string) ?? '';
  const expectedKey = process.env.BFF_INTERNAL_KEY ?? '';
  if (!safeEqual(internalKey, expectedKey)) {
    res.status(401).json({
      success: false,
      data: { code: 'UNAUTHORIZED', details: [], requestId: crypto.randomUUID() },
      message: 'Clave interna inválida',
    });
    return;
  }

  const idToken = req.body?.idToken;
  if (!idToken) {
    res.status(422).json({
      success: false,
      data: {
        code: 'VALIDATION_ERROR',
        details: ['idToken ausente'],
        requestId: crypto.randomUUID(),
      },
      message: 'idToken ausente',
    });
    return;
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken, true);
    const email = decodedToken.email;
    if (!email) {
      throw new Error('No email in token');
    }

    const user = await findAuthorizedUser(email);
    if (!user || !user.active) {
      res.status(403).json({
        success: false,
        data: { code: 'PERMISSION_DENIED', details: [], requestId: crypto.randomUUID() },
        message: 'Usuario no autorizado o inactivo',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { uid: decodedToken.uid, email: user.email, role: user.role },
      message: 'Autenticación exitosa',
    });
  } catch (err) {
    console.error('[INTERNAL_AUTH] Error:', err);
    res.status(401).json({
      success: false,
      data: { code: 'UNAUTHORIZED', details: [], requestId: crypto.randomUUID() },
      message: 'Token inválido o expirado',
    });
  }
});
