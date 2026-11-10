import { logger as cloudLogger } from 'firebase-functions/logger';

import type { Logger } from '../../application/ports/logger';

function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return error;
}

export function createCloudLogger(): Logger {
  return {
    debug: (message, meta) => cloudLogger.debug(message, meta ?? {}),
    info: (message, meta) => cloudLogger.info(message, meta ?? {}),
    warn: (message, meta) => cloudLogger.warn(message, meta ?? {}),
    error: (message, error, meta) =>
      cloudLogger.error(message, { ...meta, error: serializeError(error) }),
  };
}
