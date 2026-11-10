import type { ErrorCode } from '../domain/errors/errorCatalog';

import type { ErrorStatus } from './contractStatus';

/** Único lugar que conoce la relación código → estado HTTP. */
export const STATUS_BY_CODE = {
  VALIDATION_ERROR: 422,
  CONSENT_REQUIRED: 422,
  UNSUPPORTED_MEDIA: 422,
  IMAGE_TOO_LARGE: 422,
  IMAGE_TOO_SMALL: 422,
  UNAUTHORIZED: 401,
  PERMISSION_DENIED: 403,
  NOT_FOUND: 404,
  PROPERTY_NOT_FOUND: 404,
  SERVICE_NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  EMAIL_DELIVERY_FAILED: 502,
  INTERNAL: 500,
} as const satisfies Record<ErrorCode, ErrorStatus>;
