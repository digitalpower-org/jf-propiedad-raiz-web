import * as admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

export const getAdminApp = () => {
  if (!getApps().length) {
    // Para verificar idTokens de Firebase Auth de producción, debemos eliminar
    // FIREBASE_AUTH_EMULATOR_HOST del entorno. Si no, el Admin SDK intentará
    // verificar contra el emulador de Auth local en lugar de producción.
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    }
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'jf-propiedad-raiz',
    });
  }
  return admin.app();
};

export const db = admin.firestore(getAdminApp());
