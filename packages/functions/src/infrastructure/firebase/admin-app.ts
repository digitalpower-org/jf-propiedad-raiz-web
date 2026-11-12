import * as admin from 'firebase-admin';
import { getApps, type App } from 'firebase-admin/app';

import type { ServerConfig } from '../config/server-config';

/**
 * Inicializa Firebase Admin una sola vez por instancia.
 *
 * Se elimina `FIREBASE_AUTH_EMULATOR_HOST` para que `verifyIdToken` valide
 * contra Firebase Auth de producción, tal como exige el flujo de sesión.
 */
export function getAdminApp(
  config: Pick<ServerConfig, 'firebaseProjectId' | 'firebaseAuthEmulatorHost'>,
): App {
  if (!getApps().length) {
    if (config.firebaseAuthEmulatorHost) {
      delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    }
    admin.initializeApp({ projectId: config.firebaseProjectId });
  }
  return admin.app();
}
