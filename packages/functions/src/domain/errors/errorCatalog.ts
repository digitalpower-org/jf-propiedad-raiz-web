/**
 * Catálogo único de errores del backend (B2, B3).
 *
 * Es la fuente runtime del vocabulario. No contiene estados HTTP: el mapeo
 * código → estado vive exclusivamente en `presentation/errorStatus.ts`.
 *
 * Cualquier cambio aquí debe reflejarse en `docs/openapi.backend.yaml` y en
 * `@jf/shared-types`; el check de compilación de `errorCatalog.contract.ts`
 * falla si divergen.
 */
export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'CONSENT_REQUIRED',
  'UNSUPPORTED_MEDIA',
  'IMAGE_TOO_LARGE',
  'IMAGE_TOO_SMALL',
  'UNAUTHORIZED',
  'PERMISSION_DENIED',
  'NOT_FOUND',
  'PROPERTY_NOT_FOUND',
  'SERVICE_NOT_FOUND',
  'METHOD_NOT_ALLOWED',
  'CONFLICT',
  'RATE_LIMITED',
  'EMAIL_DELIVERY_FAILED',
  'INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
