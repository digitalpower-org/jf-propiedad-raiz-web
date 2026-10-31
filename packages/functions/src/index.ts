import { setGlobalOptions } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';

import { HEALTH_OK } from './health';
import { internalAuth } from './presentation/http/internal-auth';

setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

export const health = onRequest((_request, response) => {
  response.status(200).json(HEALTH_OK);
});

export { internalAuth };
