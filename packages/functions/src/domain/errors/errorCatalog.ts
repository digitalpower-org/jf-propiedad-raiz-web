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

/**
 * Acceso tipado a los códigos de error para evitar strings hardcodeados.
 *
 * Uso: `errorCode.validationError` en lugar de `'VALIDATION_ERROR'`.
 * Cada valor es de tipo `ErrorCode`, válido para `ApiError(code, message, details?)`.
 *
 * Mantener sincronizado con `ERROR_CODES` arriba.
 */
export const errorCode = {
  validationError: 'VALIDATION_ERROR',
  consentRequired: 'CONSENT_REQUIRED',
  unsupportedMedia: 'UNSUPPORTED_MEDIA',
  imageTooLarge: 'IMAGE_TOO_LARGE',
  imageTooSmall: 'IMAGE_TOO_SMALL',
  unauthorized: 'UNAUTHORIZED',
  permissionDenied: 'PERMISSION_DENIED',
  notFound: 'NOT_FOUND',
  propertyNotFound: 'PROPERTY_NOT_FOUND',
  serviceNotFound: 'SERVICE_NOT_FOUND',
  methodNotAllowed: 'METHOD_NOT_ALLOWED',
  conflict: 'CONFLICT',
  rateLimited: 'RATE_LIMITED',
  emailDeliveryFailed: 'EMAIL_DELIVERY_FAILED',
  internal: 'INTERNAL',
} as const;
