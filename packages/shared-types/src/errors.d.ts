/**
 * Catálogo único de códigos de error y envolturas de respuesta (AC0.1.1–AC0.1.3, D15).
 * Misma tabla que `docs/openapi.backend.yaml` y `docs/openapi.bff.yaml` (`ErrorCode`).
 */

/** Códigos de error estándar (AC0.1.3). */
export type ErrorCode =
    | "VALIDATION_ERROR"
    | "CONSENT_REQUIRED"
    | "UNSUPPORTED_MEDIA"
    | "IMAGE_TOO_LARGE"
    | "IMAGE_TOO_SMALL"
    | "UNAUTHORIZED"
    | "PERMISSION_DENIED"
    | "PROPERTY_NOT_FOUND"
    | "SERVICE_NOT_FOUND"
    | "CONFLICT"
    | "RATE_LIMITED"
    | "EMAIL_DELIVERY_FAILED"
    | "INTERNAL";

/** Tabla código → estado HTTP (AC0.1.3). */
export interface ErrorCodeTable {
    readonly VALIDATION_ERROR: 422;
    readonly CONSENT_REQUIRED: 422;
    readonly UNSUPPORTED_MEDIA: 422;
    readonly IMAGE_TOO_LARGE: 422;
    readonly IMAGE_TOO_SMALL: 422;
    readonly UNAUTHORIZED: 401;
    readonly PERMISSION_DENIED: 403;
    readonly PROPERTY_NOT_FOUND: 404;
    readonly SERVICE_NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly RATE_LIMITED: 429;
    readonly EMAIL_DELIVERY_FAILED: 502;
    readonly INTERNAL: 500;
}

/** Estado HTTP asociado a un código del catálogo (AC0.1.3). */
export type ErrorCodeStatus<C extends ErrorCode> = ErrorCodeTable[C];

/** `data` del cuerpo de error (AC0.1.2). */
export interface ApiErrorData {
    readonly code: ErrorCode;
    /** Estructura según el `code`; en `VALIDATION_ERROR` lista los campos con su mensaje (AC0.1.4). */
    readonly details?: unknown;
    /** También se registra en logs (AC0.1.2). */
    readonly requestId: string;
}

/** Cuerpo de error (AC0.1.2): `{ success: false, data: { code, details, requestId }, message }`. */
export interface ApiFailure {
    readonly success: false;
    readonly data: ApiErrorData;
    /** En español; nunca expone trazas, rutas internas ni datos personales (AC0.1.5). */
    readonly message: string;
}

/** Cuerpo de éxito (AC0.1.1): `{ success: true, data, message }`. */
export interface ApiSuccess<T> {
    readonly success: true;
    readonly data: T;
    readonly message: string;
}

/** Respuesta de una operación según la envoltura estándar (AC0.1.1, AC0.1.2). */
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
