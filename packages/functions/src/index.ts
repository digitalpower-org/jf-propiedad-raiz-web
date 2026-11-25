import { setGlobalOptions } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';

import { buildUseCases } from './application/buildUseCases';
import { createInfrastructure } from './infrastructure/composition';
import { appBuilder } from './presentation/appBuilder';
import { aboutCatalogo } from './seed/catalog-data';

setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

const infrastructure = createInfrastructure();
const useCases = buildUseCases(infrastructure, {
  consignmentToEmail: infrastructure.config.consignmentToEmail,
  aboutSeed: aboutCatalogo,
  consignmentNotificationTtlSeconds: infrastructure.config.consignmentNotificationTtlSeconds,
});
const app = appBuilder(useCases, {
  internalKey: infrastructure.config.internalKey,
  logger: infrastructure.logger,
  secretComparator: infrastructure.secretComparator,
});

export const api = onRequest(app);
