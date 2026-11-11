import { getAuth } from 'firebase-admin/auth';
import type { App } from 'firebase-admin/app';

import type { ApplicationPorts } from '../application/ports';
import { createFirestoreAuthorizedUsersRepository } from './auth/authorized-users-repository';
import type { AppConfig } from './config/env';
import { loadEnv } from './config/env';
import { createSecretComparator } from './crypto/secret-comparator';
import { getAdminApp } from './firebase/admin-app';
import { createFirestore } from './firebase/firestore';
import { createFirebaseIdentityVerifier } from './firebase/identity-verifier';
import { createCloudLogger } from './logging/cloud-logger';
import { createRevalidationClient } from './revalidation/revalidation-client';
import { createFakeTranslator } from './translation/fake-translator';
import { createGoogleCloudTranslator } from './translation/google-cloud-translator';
import { createFirestorePropertiesRepository } from './properties/firestore-properties-repository';
import { createR2MediaStorage } from './media/r2-media-storage';
import { createSharpImageProcessor } from './media/sharp-image-processor';

export interface Infrastructure extends ApplicationPorts {
  readonly config: AppConfig;
}

/** Composition root: conoce todas las implementaciones y construye la infraestructura. */
export function createInfrastructure(overrides: Partial<Infrastructure> = {}): Infrastructure {
  const config = overrides.config ?? loadEnv();
  const logger = overrides.logger ?? createCloudLogger();

  let adminApp: App | undefined;
  const requireAdminApp = (): App => {
    if (adminApp === undefined) adminApp = getAdminApp(config);
    return adminApp;
  };

  return {
    config,
    logger,
    translator:
      overrides.translator ??
      (config.useFakeTranslator ? createFakeTranslator() : createGoogleCloudTranslator()),
    revalidationGateway:
      overrides.revalidationGateway ??
      createRevalidationClient({
        bffUrl: config.bffUrl,
        internalKey: config.internalKey,
        logger,
      }),
    identityVerifier:
      overrides.identityVerifier ?? createFirebaseIdentityVerifier(getAuth(requireAdminApp())),
    authorizedUsers:
      overrides.authorizedUsers ??
      createFirestoreAuthorizedUsersRepository(createFirestore(requireAdminApp())),
    secretComparator: overrides.secretComparator ?? createSecretComparator(),
    properties:
      overrides.properties ??
      createFirestorePropertiesRepository(createFirestore(requireAdminApp())),
    imageProcessor: overrides.imageProcessor ?? createSharpImageProcessor(),
    mediaStorage: overrides.mediaStorage ?? createR2MediaStorage(createSharpImageProcessor()),
  };
}
