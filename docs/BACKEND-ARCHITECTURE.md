# Backend — Arquitectura y reglas de desarrollo

**Paquete:** `packages/functions`
**Versión:** 1.0 · 7 de noviembre de 2026
**Ámbito:** exclusivamente el backend. **No** aplica a `packages/client` ni al BFF.
**Fuentes normativas:** `docs/ARCHITECTURE.md`, `docs/TASKS.md` (D1–D36), `docs/AUTHENTICATION.md`, `docs/DEFINITION-OF-DONE.md`, `docs/openapi.backend.yaml`, `docs/QA.md`.

> Este documento es la referencia normativa del backend. Si contradice a `packages/functions/.opencoderules`, prevalece este documento y `.opencoderules` debe actualizarse.

---

## 0. Decisiones cerradas

Estas decisiones se aplicaron a la versión 1.0. Cualquier cambio requiere actualizar este documento y el contrato OpenAPI.

| ID | Decisión |
| :-- | :-- |
| B1 / E1 / E6 | **Una sola Cloud Function HTTP** (`api`). Internamente se usa **Express** (`onRequest(app)`). Se añaden `express` y `@types/express`. |
| B2 | `domain/errorCatalog.ts` es la **fuente única del vocabulario** en runtime. El **estado HTTP vive solo en Presentation**. La paridad con el contrato se valida en compilación contra el tipo generado de OpenAPI (`components['schemas']['ErrorCode']`). |
| B3 | El catálogo espeja los **15 códigos reales** del contrato. |
| B4 / E2 | El envelope **no** incluye marcas de tiempo. Se respeta estrictamente D15. |
| B5 / E4 | **100 % de tests pasando** y **≥ 80 % de cobertura** en `packages/functions`. |
| B6 / E5 | Persistencia: **Firestore**. Se descarta cualquier base local alternativa, incluso en tests (se usa el emulador). |
| B7 | `docs/ARCHITECTURE.md` §4 pasa de “Interfaces” a **“Presentation”**. |
| B8 | Los **puertos** viven en `application` (o en `domain` si son vitales para una regla pura). Las **implementaciones** viven en `infrastructure`. |
| B9 | El endpoint interno de autenticación deja de ser una función HTTP independiente: pasa a ser una **ruta Express** y su lógica se mueve a un **caso de uso**. |
| E3 | El catálogo de errores se valida contra el contrato generado. |

---

## 1. Principios

### 1.1. Clean Architecture

El backend se organiza en cuatro capas con una regla de dependencia unidireccional:

```
Presentation ──▶ Application ──▶ Domain
      │                │
      └───────────────▶│◀──────────── Infrastructure
                       │
              (Infrastructure implementa los puertos
               que Application/Domain declaran)
```

- **Domain** no conoce nada externo.
- **Application** conoce Domain y declara puertos. No conoce Express, Firebase ni SDKs.
- **Presentation** conoce Application y Express. No conoce Infrastructure.
- **Infrastructure** conoce Application (implementa sus puertos) y los SDKs. No conoce Presentation.

### 1.2. Sobre “sin framework”

El backend **sí** usa Express, pero **solo como adaptador HTTP dentro de Presentation**. La regla real es: *ningún framework en Domain ni en Application*. Firebase Functions es el runtime; Express queda confinado a `presentation/`.

### 1.3. SOLID, Clean Code y DRY

- **SRP:** una clase/módulo tiene una sola razón para cambiar. Un caso de uso = una acción; un handler = orquestación HTTP; un adaptador = una tecnología.
- **DIP:** Application y Domain dependen de interfaces (puertos), nunca de SDKs. Infrastructure inyecta las implementaciones.
- **Clean Code:** nombres en el dominio del negocio, funciones cortas, sin efectos colaterales ocultos, sin `any`, sin `as` innecesarios.
- **DRY:** una sola fuente para el catálogo de errores, las rutas, el envelope y las reglas de negocio. DRY no significa fusionar cosas que cambian por razones distintas.

---

## 2. Regla de dependencias

| Capa | Puede importar | No puede importar |
| :-- | :-- | :-- |
| **Domain** | `zod`, utilidades puras del propio dominio | Express, Firebase, SDKs, `infrastructure`, `presentation`, `application` |
| **Application** | `domain`, `zod` (tipos/validación de comandos), puertos propios | Express, `firebase-admin`, `firebase-functions`, SDKs, `infrastructure`, `presentation` |
| **Presentation** | `application`, `domain` (tipos de error), `express`, `zod`, `@jf/shared-types` (solo tipos) | `infrastructure`, SDKs de persistencia/correo/almacenamiento |
| **Infrastructure** | `application` (puertos), SDKs, `@jf/shared-types` (solo tipos) | `presentation` |

> `@jf/shared-types` se importa **solo con `import type`** en `packages/functions` (D35). El runtime de errores del backend es `domain/errorCatalog.ts`; `errors.json` es runtime del BFF y del navegador.

---

## 3. Estructura objetivo

```
packages/functions/src/
├── domain/
│   ├── entities/
│   │   ├── property.ts
│   │   ├── service.ts
│   │   └── about.ts
│   ├── value-objects/
│   │   ├── precio.ts
│   │   ├── operacion.ts
│   │   ├── tipo-propiedad.ts
│   │   ├── slug.ts
│   │   ├── role.ts
│   │   └── ...
│   └── errors/
│       ├── api-error.ts
│       └── errorCatalog.ts          # 15 códigos, sin HTTP
│
├── application/
│   ├── ports/
│   │   ├── authorized-users-repository.ts
│   │   ├── identity-verifier.ts
│   │   ├── properties-repository.ts
│   │   ├── services-repository.ts
│   │   ├── about-repository.ts
│   │   ├── media-storage.ts
│   │   ├── image-processor.ts
│   │   ├── email-sender.ts
│   │   ├── translator.ts
│   │   ├── unit-of-work.ts
│   │   ├── logger.ts
│   │   ├── clock.ts
│   │   ├── id-generator.ts
│   │   └── rate-limiter.ts
│   ├── buildUseCases.ts
│   ├── use-case.ts
│   └── use-cases/
│       ├── auth/verify-internal-session.ts
│       ├── properties/...
│       ├── services/...
│       ├── about/...
│       ├── media/...
│       └── email/...
│
├── presentation/
│   ├── appBuilder.ts
│   ├── routes.ts
│   ├── paths.ts
│   ├── protocol.ts
│   ├── contractStatus.ts
│   ├── errorStatus.ts
│   ├── handlers/
│   │   ├── index.ts
│   │   ├── auth/verify-internal-session.ts
│   │   ├── properties/...
│   │   └── ...
│   ├── guards/
│   │   ├── internal-key.ts
│   │   └── ...
│   └── middlewares/
│       ├── request-id.ts
│       ├── error.ts
│       └── not-found.ts
│
├── infrastructure/
│   ├── composition.ts               # composition root
│   ├── config/env.ts
│   ├── firebase/
│   │   ├── admin-app.ts
│   │   ├── firestore.ts
│   │   └── identity-verifier.ts
│   ├── auth/authorized-users-repository.ts
│   ├── properties/firestore-properties-repository.ts
│   ├── services/firestore-services-repository.ts
│   ├── about/firestore-about-repository.ts
│   ├── storage/r2-media-storage.ts
│   ├── media/sharp-image-processor.ts
│   ├── email/resend-email-sender.ts
│   ├── translation/google-translator.ts
│   ├── persistence/firestore-unit-of-work.ts
│   ├── logging/cloud-logger.ts
│   └── time/system-clock.ts
│
└── index.ts                         # bootstrap: una sola función `api`
```

> `shared/` o `cross-cutting/` es opcional. Solo si aparece un helper realmente transversal (p. ej. paginación). No es un cajón de sastre.

---

## 4. Domain

### 4.1. Entidades

Clases con estado privado y reglas que siempre se cumplen. No son `interface` planas cuando hay invariantes.

```ts
export class Property {
  private constructor(
    readonly id: string,
    readonly operacion: Operacion,
    readonly precio: Precio,
    // ...
  ) {}

  static create(input: CreatePropertyInput): Property {
    // valida y normaliza; lanza ApiError('VALIDATION_ERROR', ...)
  }

  changePrice(precio: Precio): Property {
    // devuelve una nueva instancia; nunca muta
  }
}
```

Reglas:

- Las entidades **no** reciben `Request`, `Response`, `Firestore` ni SDKs.
- Las entidades **no** formatean respuestas ni conocen códigos HTTP.
- Si una regla necesita tiempo, se inyecta el puerto `Clock` (declarado en `domain/ports/` solo si la regla es pura y vital).

### 4.2. Value Objects con Zod

Un archivo por VO. El tipo se deriva de Zod (`z.infer`), no se declara dos veces. La normalización ocurre en `parse`.

```ts
// domain/value-objects/precio.ts
import { z } from 'zod';

const precioSchema = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER)
  .brand<'Precio'>();

export type Precio = z.infer<typeof precioSchema>;
export const parsePrecio = (input: unknown): Precio => precioSchema.parse(input);
```

Reglas:

- **Un VO, un archivo.**
- Enums cerrados con `const X_VALUES = [...] as const` y `z.enum(X_VALUES)`.
- `parse` es la frontera: normaliza (trim, minúsculas, etc.) y lanza `ZodError`.
- No se permite `as Precio` fuera del propio archivo del VO.

### 4.3. Catálogo de errores

`domain/errorCatalog.ts` es la fuente única del vocabulario en runtime. **No contiene estados HTTP.**

```ts
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
```

`ApiError` es el error de negocio. No conoce HTTP.

```ts
// domain/errors/api-error.ts
import type { ErrorCode } from './errorCatalog';

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    // exactOptionalPropertyTypes: no asignar undefined explícitamente.
    if (details !== undefined) this.details = details;
  }
}
```

### 4.4. Qué NO va en Domain

- Estados HTTP (`404`, `422`…).
- `Request`/`Response`.
- `firebase-admin`, `firebase-functions`, `express`, `resend`, `sharp`, AWS SDK.
- Formateo de respuestas.

---

## 5. Application

### 5.1. Contrato de caso de uso

```ts
export interface UseCase<Command, Result> {
  execute(command: Command): Promise<Result>;
}
```

- Un caso de uso por acción.
- Un archivo por caso de uso.
- Recibe **VOs ya parseados** (la validación técnica ocurre en Presentation; la de negocio, en Domain/Application).
- Devuelve un resultado tipado. **No** devuelve `Response`, ni envelope, ni códigos HTTP.
- Lanza `ApiError` para errores esperados. `ZodError` solo si hay una decisión de negocio real.

### 5.2. Orden interno de un caso de uso

1. **Validaciones baratas fail-fast** (formato, coherencia, permisos locales).
2. **Lecturas** necesarias.
3. **Llamadas a puertos de red/criptografía** (traducción, correo, verificación de identidad) **fuera** de la transacción.
4. **Escrituras atómicas** dentro de `UnitOfWork`.
5. **Log de negocio/resultado** (nunca datos sensibles).

### 5.3. Puertos

Los puertos se declaran en `application/ports/` (o en `domain/ports/` solo si una regla pura los necesita).

| Puerto | Responsabilidad | Adaptador (Infrastructure) |
| :-- | :-- | :-- |
| `AuthorizedUsersRepository` | Leer la lista blanca de usuarios activos | Firestore |
| `IdentityVerifier` | Verificar un `idToken` de Firebase | Firebase Admin |
| `PropertiesRepository` | Persistencia de inmuebles | Firestore |
| `ServicesRepository` | Persistencia de servicios | Firestore |
| `AboutRepository` | Persistencia de “Acerca de” | Firestore |
| `MediaStorage` | URLs prefirmadas y confirmación | Cloudflare R2 |
| `ImageProcessor` | Validación/transformación de imágenes | Sharp |
| `EmailSender` | Envío de correos | Resend |
| `Translator` | Traducción de campos | Google Cloud Translation |
| `UnitOfWork` | Transacción atómica | Firestore |
| `Logger` | Log estructurado | `firebase-functions/logger` |
| `Clock` | Tiempo inyectable | `Date` |
| `IdGenerator` | IDs | `crypto.randomUUID` |
| `RateLimiter` | Límite de peticiones | Firestore / Cloud Armor |

Reglas:

- El puerto es una `interface` con tipos del dominio/aplicación. No menciona SDKs.
- **Ninguna implementación** vive en `application`.
- Un caso de uso recibe sus puertos por constructor; nunca los importa de `infrastructure`.
- `Translator` y `AuthorizedUsersRepository` dejan de estar mal ubicados: hoy `Translator` está en `infrastructure` y `authorized-users` no tiene interfaz.

### 5.4. `buildUseCases`

Único lugar donde se construyen los casos de uso. Recibe el agregado de puertos y devuelve el mapa de casos de uso.

```ts
// application/buildUseCases.ts
import type { ApplicationPorts } from './ports';
import { VerifyInternalSessionUseCase } from './use-cases/auth/verify-internal-session';

export interface UseCases {
  readonly verifyInternalSession: VerifyInternalSessionUseCase;
  // ...
}

export function buildUseCases(ports: ApplicationPorts): UseCases {
  return {
    verifyInternalSession: new VerifyInternalSessionUseCase(
      ports.identityVerifier,
      ports.authorizedUsers,
      ports.logger,
    ),
    // ...
  };
}
```

### 5.5. Prohibiciones

- Importar `express`, `firebase-admin`, `firebase-functions` o cualquier SDK.
- Construir respuestas HTTP o conocer estados HTTP.
- Acceder a `process.env` directamente (se inyecta configuración).
- Formatear mensajes de error para el cliente.
- Usar librerías de criptografía o servicios externos directamente: siempre detrás de un puerto.

---

## 6. Presentation

### 6.1. Express + una sola Cloud Function

- `express@^5` como adaptador HTTP.
- `@types/express@^5` en `devDependencies`.
- Una sola función exportada: `api = onRequest(app)`.
- Express **no** sale de `presentation/`.

### 6.2. `appBuilder`

```ts
// presentation/appBuilder.ts
import express, { type Express } from 'express';
import type { UseCases } from '../application/buildUseCases';
import type { Logger } from '../application/ports/logger';
import { requestId } from './middlewares/request-id';
import { makeErrorMiddleware } from './middlewares/error';
import { notFoundMiddleware } from './middlewares/not-found';
import { apiRouter } from './routes';

export interface ApiDeps {
  readonly internalKey: string;
  readonly logger: Logger;
}

export function appBuilder(useCases: UseCases, deps: ApiDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(requestId);
  app.use(apiRouter(useCases, deps));
  app.use(notFoundMiddleware);
  app.use(makeErrorMiddleware(deps.logger));
  return app;
}
```

Orden obligatorio: `json` → `requestId` → rutas → `notFound` → `error`. El middleware de error va **último** y con cuatro argumentos.

### 6.3. Rutas declarativas

```ts
// presentation/routes.ts
import { Router, type RequestHandler } from 'express';
import type { UseCases } from '../application/buildUseCases';
import type { ApiDeps } from './appBuilder';
import { API_PATHS } from './paths';
import { buildHandlers } from './handlers';
import { internalKeyGuard } from './guards/internal-key';
import { methodNotAllowed } from './middlewares/method-not-allowed';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface RouteDeclaration {
  readonly method: HttpMethod;
  readonly path: string;
  readonly guards: readonly RequestHandler[];
  readonly handler: RequestHandler;
}

export function apiRouter(useCases: UseCases, deps: ApiDeps): Router {
  const router = Router();
  const handlers = buildHandlers(useCases);
  const guardInternal = internalKeyGuard(deps);

  const routes: readonly RouteDeclaration[] = [
    {
      method: 'post',
      path: API_PATHS.verifyInternalSession,
      guards: [guardInternal],
      handler: handlers.verifyInternalSession,
    },
    // ...
  ];

  for (const route of routes) {
    router[route.method](route.path, ...route.guards, route.handler);
  }

  // 405: si ninguna ruta anterior respondió, el método no está permitido.
  for (const path of new Set(routes.map((route) => route.path))) {
    router.all(path, methodNotAllowed);
  }

  return router;
}
```

### 6.4. Handlers finos

Un handler hace **cuatro cosas** y nada más:

1. Parsea la entrada con Zod (body, query, params, headers).
2. Llama al caso de uso.
3. Escribe el envelope de éxito.
4. Deriva cualquier error a `next(err)`.

```ts
// presentation/handlers/auth/verify-internal-session.ts
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { VerifyInternalSessionUseCase } from '../../../application/use-cases/auth/verify-internal-session';
import type { VerifiedIdentity } from '../../../application/use-cases/auth/verify-internal-session';
import { writeSuccess } from '../../protocol';

const bodySchema = z.object({ idToken: z.string().min(1) });

export type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

export const makeVerifyInternalSessionHandler =
  (useCase: VerifyInternalSessionUseCase): AsyncHandler =>
  async (req, res, next) => {
    try {
      const body = bodySchema.parse(req.body);
      const identity = await useCase.execute({ idToken: body.idToken });
      writeSuccess<VerifiedIdentity>(res, identity, 'Identidad verificada');
    } catch (error) {
      next(error);
    }
  };
```

Reglas:

- **Sin lógica de negocio** en el handler.
- **Sin acceso a Firestore/SDKs**.
- **Sin `res.status(...).json(...)`** repetido: se usa `writeSuccess`/`writeError`.
- Los handlers declaran el tipo del `data` que devuelven.

### 6.4.1. Rate limiting y defensas de transporte vs lógica de negocio

El handler puede ejecutar **defensas de transporte** (metadata HTTP, headers, IP, rate limiting) antes de invocar el caso de uso. El caso de uso ejecuta **reglas de negocio** (campos del DTO de entrada, invariantes de dominio).

| Defensa | Dato de entrada | Capa | Ejemplo (consignación) |
| :--- | :--- | :--- | :--- |
| Rate limiting | `X-Client-IP` (header) | **Presentation (handler)** | Máximo 5 envíos/min por IP → 429 `RATE_LIMITED` |
| Honeypot | `sitio` (campo del body `ConsignmentInput`) | **Application (caso de uso)** | Si tiene valor → éxito sin enviar correos |
| Consentimiento | `consent` (campo del body) | **Application (caso de uso)** | Faltante → 422 `CONSENT_REQUIRED` |

Regla general:

- **Handler (Presentation):** valida headers (`X-Client-IP`, `Authorization`, etc.), ejecuta `RateLimiter.check()`, valida el cuerpo con Zod. Cualquier error derivado de metadata de transporte se lanza como `ApiError` y el middleware lo traduce al estado HTTP.
- **Caso de uso (Application):** recibe el DTO ya parseado, aplica reglas de negocio (honeypot, consentimiento, validaciones de dominio), envía correos, escribe. No conoce IPs, headers ni SDKs HTTP.

Por qué no al revés: si el rate limiting vive en el caso de uso, el dominio acopla metadata de transporte (IP) y el caso de uso deja de ser portable y testeable sin mockear el rate limiter. Si el honeypot vive en el handler, el handler conoce campos del DTO de negocio y duplica reglas que ya aplican al caso de uso.

```ts
// Handler: defensa de transporte (rate limit por IP).
await rateLimiter.check(clientIp, 5, 60);
bodySchema.parse(req.body);
await useCase.execute({ input: req.body });

// Caso de uso: regla de negocio (honeypot y consentimiento).
if (input.sitio && input.sitio.trim().length > 0) return { enviado: false };
if (!input.consent) throw new ApiError(errorCode.consentRequired, '…');
```


- `body`, `query`, `params` y `headers` se validan con Zod en Presentation.
- Se usa `.parse(...)` (lanza `ZodError` → 422 `VALIDATION_ERROR`) salvo que exista una **decisión de negocio real** que justifique `safeParse` (p. ej. intentar dos formatos y elegir). Esa decisión se documenta en el caso de uso.
- Los mensajes de validación se traducen a `details` con `{ field, issue }` en el middleware de error. Nunca se expone el stack.

### 6.6. Envelope (D15, sin campos extra)

Éxito:

```json
{ "success": true, "data": { "…": "…" }, "message": "…" }
```

Error:

```json
{
  "success": false,
  "data": { "code": "VALIDATION_ERROR", "details": {}, "requestId": "…" },
  "message": "…"
}
```

Reglas:

- Se usan los tipos `ApiSuccess<T>` / `ApiFailure` de `@jf/shared-types` (solo `import type`).
- **No** se añaden campos fuera del contrato (ni marcas de tiempo, ni `path`, ni `stack`).
- `message` en español; nunca expone trazas, rutas internas ni datos personales.

```ts
// presentation/protocol.ts
import type { Response } from 'express';
import type { ApiFailure, ApiErrorData, ApiSuccess } from '@jf/shared-types';
import type { SuccessStatus, ErrorStatus } from './contractStatus';

export function writeSuccess<T>(
  res: Response,
  data: T,
  message: string,
  status: SuccessStatus = 200,
): void {
  const body: ApiSuccess<T> = { success: true, data, message };
  res.status(status).json(body);
}

export function writeError(
  res: Response,
  status: ErrorStatus,
  data: ApiErrorData,
  message: string,
): void {
  const body: ApiFailure = { success: false, data, message };
  res.status(status).json(body);
}
```

### 6.7. Errores: `ApiError`, `ZodError` y middleware central

El **único** lugar que conoce la relación código → estado HTTP es `STATUS_BY_CODE`, en Presentation.

```ts
// presentation/contractStatus.ts
import type { BackendSpec } from '@jf/shared-types';

type Operations = BackendSpec.operations;
type ContractStatus = {
  [K in keyof Operations]: keyof Operations[K]['responses'];
}[keyof Operations];

export type SuccessStatus = Extract<ContractStatus, 200 | 201 | 204>;
export type ErrorStatus = Extract<
  ContractStatus,
  400 | 401 | 403 | 404 | 405 | 409 | 422 | 429 | 500 | 502
>;
```

```ts
// presentation/errorStatus.ts
import type { ErrorCode } from '../domain/errors/errorCatalog';
import type { ErrorStatus } from './contractStatus';

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
```

```ts
// presentation/middlewares/error.ts
import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import type { Logger } from '../../application/ports/logger';
import { ApiError } from '../../domain/errors/api-error';
import type { ApiErrorData } from '@jf/shared-types';
import { STATUS_BY_CODE } from '../errorStatus';
import { writeError } from '../protocol';

const VALIDATION_MESSAGE = 'Datos inválidos';

export function makeErrorMiddleware(logger: Logger) {
  return (error: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    const requestId = String(res.locals.requestId ?? '');

    if (error instanceof ApiError) {
      const data: ApiErrorData =
        error.details === undefined
          ? { code: error.code, requestId }
          : { code: error.code, details: error.details, requestId };
      writeError(res, STATUS_BY_CODE[error.code], data, error.message);
      return;
    }

    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => ({
        field: issue.path.join('.'),
        issue: issue.message,
      }));
      writeError(
        res,
        STATUS_BY_CODE.VALIDATION_ERROR,
        { code: 'VALIDATION_ERROR', details, requestId },
        VALIDATION_MESSAGE,
      );
      return;
    }

    logger.error('unhandled_error', error, { requestId });
    writeError(
      res,
      STATUS_BY_CODE.INTERNAL,
      { code: 'INTERNAL', requestId },
      'Error interno',
    );
  };
}
```

> `exactOptionalPropertyTypes: true`: no escribas `details: undefined`. Omite la propiedad, como en el ejemplo.

### 6.8. 404 y 405

- **404:** `notFoundMiddleware` al final de la cadena, antes del middleware de error. Lanza `ApiError('NOT_FOUND', …)`.
- **405:** por cada ruta declarada se registra `router.all(path, methodNotAllowed)` después de los métodos reales. Express solo lo ejecuta si ningún método anterior respondió.
- Si se necesita `OPTIONS` (CORS), se declara explícitamente; no se depende del comportamiento implícito del router.

```ts
// presentation/middlewares/not-found.ts
import type { RequestHandler } from 'express';
import { ApiError } from '../../domain/errors/api-error';

export const notFoundMiddleware: RequestHandler = (_req, _res, next) => {
  next(new ApiError('NOT_FOUND', 'Recurso no encontrado'));
};
```

### 6.9. Rutas tipadas contra OpenAPI

```ts
// presentation/paths.ts
import type { BackendSpec } from '@jf/shared-types';

type ContractPath = keyof BackendSpec.paths;

// Convierte `/api/v1/properties/{idOrSlug}` → `/api/v1/properties/:idOrSlug`.
type ToExpressPath<P extends string> =
  P extends `${infer Head}{${infer Param}}${infer Tail}`
    ? `${Head}:${Param}${ToExpressPath<Tail>}`
    : P;

export type ExpressPath = ToExpressPath<ContractPath>;

export const API_PATHS = {
  verifyInternalSession: '/internal/auth/verify' satisfies ExpressPath,
  properties: '/api/v1/properties' satisfies ExpressPath,
  featuredProperties: '/api/v1/properties/featured' satisfies ExpressPath,
  property: '/api/v1/properties/:idOrSlug' satisfies ExpressPath,
  // ...
} as const;
```

Reglas:

- Toda ruta del contrato se declara aquí. Si se escribe mal, falla el `tsc`.
- `/health` es operativa y **no** está en `openapi.backend.yaml`; vive en `OPS_PATHS` y no se valida contra el contrato. Si se quiere tipar, primero se añade a la spec.

### 6.10. Guards

- Se ejecutan antes del handler (`internalKeyGuard`, rate limit, etc.).
- No contienen lógica de negocio.
- Fallan con `next(new ApiError(...))`, nunca con `res.status(...)` directo.
- La comparación de secretos usa `timingSafeEqual` (Node `crypto`) o un `SecretComparator` inyectado desde Infrastructure.

### 6.11. `requestId`

- Se toma de `X-Request-Id` si es válido (longitud y caracteres acotados) o se genera con `crypto.randomUUID()`.
- Se guarda en `res.locals.requestId`.
- Se incluye en logs y en `data.requestId` de los errores.
- No se confía en el valor del cliente para autorización.

---

## 7. Infrastructure

### 7.1. Adaptadores

- Cada puerto tiene **un** adaptador por tecnología.
- El adaptador traduce entre el mundo externo y los tipos de Application/Domain.
- Valida los datos que llegan del exterior (p. ej. un documento de Firestore) con Zod antes de devolverlos.
- No contiene reglas de negocio.
- No importa `presentation`.

### 7.2. Composition root

Único lugar que conoce todas las implementaciones y construye la infraestructura. **No** construye casos de uso.

```ts
// infrastructure/composition.ts
import type { ApplicationPorts } from '../application/ports';
import type { AppConfig } from './config/env';
import { loadEnv } from './config/env';
import { createCloudLogger } from './logging/cloud-logger';
import { getAdminApp } from './firebase/admin-app';
import { createFirebaseIdentityVerifier } from './firebase/identity-verifier';
import { createFirestoreAuthorizedUsersRepository } from './auth/authorized-users-repository';
// ...

export interface Infrastructure extends ApplicationPorts {
  readonly config: AppConfig;
}

export function createInfrastructure(
  overrides: Partial<Infrastructure> = {},
): Infrastructure {
  const config = overrides.config ?? loadEnv();
  const logger = overrides.logger ?? createCloudLogger();
  const adminApp = getAdminApp(config);

  return {
    config,
    logger,
    identityVerifier:
      overrides.identityVerifier ?? createFirebaseIdentityVerifier(adminApp),
    authorizedUsers:
      overrides.authorizedUsers ??
      createFirestoreAuthorizedUsersRepository(adminApp.firestore()),
    // ...
  };
}
```

`overrides` permite inyectar fakes en tests sin tocar producción.

### 7.3. Configuración

- `infrastructure/config/env.ts` valida `process.env` con Zod al arrancar. Si falta una variable, falla rápido.
- Application/Domain reciben valores ya validados, nunca `process.env`.
- Los secretos no se registran en logs.

### 7.4. Firebase Admin

- Una sola inicialización por instancia (`getApps()` / `initializeApp()`).
- **Nunca** `getAuth()` a nivel de módulo en Presentation.
- El adaptador `FirebaseIdentityVerifier` encapsula `verifyIdToken(idToken, true)`.

---

## 8. Bootstrap: una sola Cloud Function

```ts
// src/index.ts
import { setGlobalOptions } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { buildUseCases } from './application/buildUseCases';
import { createInfrastructure } from './infrastructure/composition';
import { appBuilder } from './presentation/appBuilder';

setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

const infrastructure = createInfrastructure();
const useCases = buildUseCases(infrastructure);
const app = appBuilder(useCases, {
  internalKey: infrastructure.config.internalKey,
  logger: infrastructure.logger,
});

export const api = onRequest(app);
```

Reglas:

- **Una sola** función HTTP exportada (`api`). No hay funciones HTTP por endpoint.
- El arranque valida configuración y construye infraestructura una vez por instancia.
- Si el arranque falla, la función falla rápido y el error queda en Cloud Logging.

---

## 9. Decisiones tecnológicas

### 9.1. `jose` (JWT)

**Decisión: no se añade `jose` en la versión 1.**

Motivos:

- El backend **no emite** JWT de sesión. El BFF emite su cookie firmada con `crypto` nativo (`packages/client/src/server/session/jwt.ts`, decisión previa).
- El backend **verifica** `idToken` de Firebase con `firebase-admin` (`verifyIdToken(idToken, true)`), que ya resuelve firma, expiración, audiencia e issuer.
- Añadir `jose` ahora duplicaría responsabilidades y sumaría superficie de dependencias sin un caso de uso real.

Si en el futuro el backend necesita firmar o verificar JWT propios (servicio a servicio, webhooks, tokens de un solo uso):

1. Se declara un puerto `TokenSigner` / `TokenVerifier` en `application/ports/`.
2. El adaptador con `jose` vive en `infrastructure/`.
3. **Nunca** se importa `jose` desde Domain ni Application.
4. Se documenta la decisión y se añaden tests de expiración, firma inválida y `alg` permitido.

`jose` funciona en el runtime de Functions (Node 20/22, WebCrypto), pero su uso debe ser una necesidad explícita, no una dependencia preventiva.

### 9.2. Logging

**Decisión: no se añade Pino.** Se usa un logger propio y centralizado sobre `firebase-functions/logger`, que ya viene incluido en `firebase-functions@7.4.0`.

Motivos:

- Integración nativa con Google Cloud Logging (JSON estructurado, severidad, `jsonPayload`).
- Cero dependencias adicionales.
- Funciona igual en emulador y en producción.
- Evita configuración de transporte/serialización que Pino requeriría.

Puerto:

```ts
// application/ports/logger.ts
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: unknown, meta?: Record<string, unknown>): void;
}
```

Adaptador:

```ts
// infrastructure/logging/cloud-logger.ts
import { logger as cloudLogger } from 'firebase-functions/logger';
import type { Logger } from '../../application/ports/logger';

export function createCloudLogger(): Logger {
  return {
    debug: (message, meta) => cloudLogger.debug(message, meta ?? {}),
    info: (message, meta) => cloudLogger.info(message, meta ?? {}),
    warn: (message, meta) => cloudLogger.warn(message, meta ?? {}),
    error: (message, error, meta) =>
      cloudLogger.error(message, { ...meta, error: serializeError(error) }),
  };
}

function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return error;
}
```

Reglas:

- El logger se inyecta por puerto; Domain/Application no importan `firebase-functions`.
- Nunca se registran tokens, `idToken`, secretos, correos completos ni datos personales.
- `requestId` siempre presente en logs de petición.
- En tests se inyecta un logger falso que acumula entradas.

### 9.3. Hashing de contraseñas y filtrado de credenciales

- **No** se usan `argon2` ni servicios de filtrado de credenciales (HIBP).
- La identidad la aporta Firebase Auth (Google Sign-In). El backend nunca recibe ni almacena contraseñas.
- Si en el futuro se añade un flujo con contraseña, se declara un puerto `PasswordHasher` en `application/ports/` y el adaptador vive en `infrastructure/`. Domain y Application no importan la librería.

---

## 10. Contrato y tipos compartidos

### 10.1. `import type` obligatorio

En `packages/functions` solo se importan **tipos** de `@jf/shared-types` (D35). El runtime del backend no depende de `errors.json` ni de los archivos del BFF.

```ts
import type { ApiSuccess, ApiFailure, ApiErrorData, ErrorCodeTable } from '@jf/shared-types';
import type { BackendSpec } from '@jf/shared-types';
```

### 10.2. Paridad del catálogo de errores

La paridad se valida en **tiempo de compilación** contra el tipo generado de OpenAPI (`components['schemas']['ErrorCode']`). No hay duplicación en runtime.

```ts
// domain/errors/errorCatalog.contract.ts  (solo tipos)
import type { BackendSpec } from '@jf/shared-types';
import type { ErrorCode } from './errorCatalog';

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;

type ContractErrorCode = BackendSpec.components['schemas']['ErrorCode'];

export type ErrorCodesMatchOpenApi = Assert<Equal<ErrorCode, ContractErrorCode>>;
```

La tabla de estados de Presentation también se valida contra `ErrorCodeTable`:

```ts
// presentation/errorStatus.contract.ts  (solo tipos)
import type { ErrorCodeTable } from '@jf/shared-types';
import type { ErrorCode } from '../domain/errors/errorCatalog';

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;

export type StatusTableMatchesSharedTypes = Assert<
  Equal<typeof import('./errorStatus').STATUS_BY_CODE, ErrorCodeTable>
>;
```

> Si se prefiere un import más corto (`import type { components } from '@jf/shared-types'`), se pueden reexportar `components`, `paths` y `operations` desde `packages/shared-types/src/index.d.ts`. La opción sin cambios es usar `BackendSpec.components[...]`.

### 10.3. Reglas

- Si se añade o elimina un código, falla el build hasta actualizar el catálogo y la spec.
- Si un estado HTTP cambia, falla el build hasta actualizar `STATUS_BY_CODE`.
- `API_PATHS` se valida contra `BackendSpec.paths` (con conversión `{param}` → `:param`).
- `SuccessStatus`/`ErrorStatus` se derivan de `BackendSpec.operations`.

---

## 11. Testing

### 11.1. Pirámide

| Nivel | Qué se prueba | Herramientas |
| :-- | :-- | :-- |
| Unitario Domain | Entidades, VOs, invariantes, catálogo | Vitest |
| Unitario Application | Casos de uso con puertos falsos | Vitest |
| Integración Presentation | Express + `supertest`, sin red | Vitest + Supertest |
| Adaptadores | Firestore, R2, Resend, Translate | Emulador / fakes de contrato |

### 11.2. Reglas

- **Sin base de datos local alternativa.** Firestore se prueba con el **emulador** o con un repositorio falso en memoria que implemente el puerto.
- Los casos de uso se prueban con fakes de sus puertos; nunca con SDKs reales.
- La app Express se prueba con `supertest` contra `appBuilder(...)`, inyectando fakes en `createInfrastructure({ ... })`.
- Cada test cubre un comportamiento observable, no implementación.
- No se borran tests para “hacer pasar” el build.

### 11.3. Gates

- **100 % de tests pasando** (`npm test`).
- **≥ 80 % de cobertura** en `packages/functions` (`npm run test:coverage`, `@vitest/coverage-v8`).
- `npm run typecheck` limpio.
- `npm run lint` limpio.
- `npm run format:check` (Prettier) limpio: todos los archivos del backend con estilo Prettier. Se ejecuta junto con typecheck, lint y test como parte de las verificaciones de calidad.

Dependencias de test pendientes de añadir: `supertest` y `@types/supertest` (dev).

---

## 12. Backlog de refactor (orden sugerido)

1. **Dependencias:** añadir `express`, `@types/express`, `supertest`, `@types/supertest`. Quitar cualquier referencia a Pino o a una base local alternativa de `.opencoderules`.
2. **Domain:** crear `domain/errors/errorCatalog.ts`, `domain/errors/api-error.ts`, `domain/value-objects/*`, `domain/entities/*`. Mover reglas hoy dispersas.
3. **Application:** crear `application/ports/*` (incluido `Translator`, hoy en `infrastructure`), mover la lógica de `internal-auth` a `VerifyInternalSessionUseCase`, crear `buildUseCases.ts`.
4. **Infrastructure:** crear `composition.ts`, `config/env.ts`, adaptadores de `IdentityVerifier` y `AuthorizedUsersRepository`; eliminar `getAuth()` a nivel de módulo; unificar `firebase-functions/v2/https`.
5. **Presentation:** crear `appBuilder`, `routes`, `paths`, `protocol`, `contractStatus`, `errorStatus`, handlers, guards y middlewares. Eliminar la función HTTP independiente de autenticación interna.
6. **Bootstrap:** dejar `src/index.ts` con una sola exportación `api`.
7. **Contrato:** añadir los checks de paridad (`errorCatalog.contract.ts`, `errorStatus.contract.ts`) y completar `API_PATHS`.
8. **Tests:** unitarios de dominio/aplicación, integración con Supertest, adaptadores con emulador/fakes. Alcanzar los gates.
9. **Docs:** actualizar `docs/ARCHITECTURE.md` §4, `packages/functions/.opencoderules` y este documento.

### 12.1. Refactor de autenticación interna (B9)

**Antes:** `presentation/http/internal-auth.ts` exportaba una función HTTP independiente; importaba `firebase-admin`, inicializaba `getAuth()` a nivel de módulo y mezclaba verificación de token, lectura de la lista blanca y respuesta HTTP.

**Después:**

- Ruta: `POST /internal/auth/verify` (`API_PATHS.verifyInternalSession`), con `internalKeyGuard`.
- Handler: parsea `{ idToken }`, llama al caso de uso, escribe el envelope.
- Caso de uso `VerifyInternalSessionUseCase`:
  - `IdentityVerifier.verify(idToken)` → `{ uid, email, emailVerified }`.
  - `AuthorizedUsersRepository.findActiveByEmail(email)` → usuario activo o `null`.
  - Errores: `UNAUTHORIZED` si el token no es válido o el correo no está verificado; `PERMISSION_DENIED` si no está en la lista blanca.
  - No conoce Express, HTTP ni Firebase Admin.
- Adaptadores: `FirebaseIdentityVerifier` (Firebase Admin) y `FirestoreAuthorizedUsersRepository` (Firestore), en Infrastructure.

```ts
// application/use-cases/auth/verify-internal-session.ts
import type { UseCase } from '../use-case';
import type { AuthorizedUsersRepository } from '../../ports/authorized-users-repository';
import type { IdentityVerifier } from '../../ports/identity-verifier';
import type { Logger } from '../../ports/logger';
import { ApiError } from '../../../domain/errors/api-error';
import type { Role } from '../../../domain/value-objects/role';

export interface VerifyInternalSessionCommand {
  readonly idToken: string;
}

export interface VerifiedIdentity {
  readonly uid: string;
  readonly email: string;
  readonly role: Role; // tipo del dominio
}

export class VerifyInternalSessionUseCase
  implements UseCase<VerifyInternalSessionCommand, VerifiedIdentity>
{
  constructor(
    private readonly identityVerifier: IdentityVerifier,
    private readonly authorizedUsers: AuthorizedUsersRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: VerifyInternalSessionCommand): Promise<VerifiedIdentity> {
    const identity = await this.identityVerifier.verify(command.idToken);

    if (identity.email === null || !identity.emailVerified) {
      throw new ApiError('UNAUTHORIZED', 'Correo no verificado');
    }

    const user = await this.authorizedUsers.findActiveByEmail(identity.email);

    if (user === null) {
      throw new ApiError('PERMISSION_DENIED', 'Usuario no autorizado');
    }

    this.logger.info('internal_session_verified', { uid: identity.uid });
    return { uid: identity.uid, email: identity.email, role: user.role };
  }
}
```

```ts
// application/ports/identity-verifier.ts
export interface VerifiedToken {
  readonly uid: string;
  readonly email: string | null;
  readonly emailVerified: boolean;
}

export interface IdentityVerifier {
  verify(idToken: string): Promise<VerifiedToken>;
}
```

```ts
// application/ports/authorized-users-repository.ts
import type { Role } from '../../domain/value-objects/role';

export interface AuthorizedUser {
  readonly email: string;
  readonly role: Role;
}

export interface AuthorizedUsersRepository {
  findActiveByEmail(email: string): Promise<AuthorizedUser | null>;
}
```

```ts
// infrastructure/firebase/identity-verifier.ts
import type { Auth } from 'firebase-admin/auth';
import type { IdentityVerifier, VerifiedToken } from '../../application/ports/identity-verifier';

export function createFirebaseIdentityVerifier(auth: Auth): IdentityVerifier {
  return {
    async verify(idToken: string): Promise<VerifiedToken> {
      const decoded = await auth.verifyIdToken(idToken, true);
      return {
        uid: decoded.uid,
        email: decoded.email ?? null,
        emailVerified: decoded.email_verified === true,
      };
    },
  };
}
```

---

## 13. Anti-patrones (prohibidos)

- **Dios en el handler:** validar + regla + persistencia + respuesta en el mismo archivo.
- **HTTP en Domain/Application:** `res.status`, `Request`, `Response`, números de estado.
- **SDK en Application:** `firebase-admin`, `firestore`, `resend`, SDKs de AWS.
- **`any` / `as` para callar tipos.** En la frontera se valida con Zod; no se fuerza el tipo.
- **`getAuth()` a nivel de módulo** en Presentation.
- **Duplicar el catálogo de errores** en varios archivos.
- **Envelope ad-hoc** en cada handler.
- **`res.status(500).json(...)`** repetido: el middleware central es el único que mapea errores.
- **Tests que dependen de red o de credenciales reales.**
- **Logger con datos sensibles** (tokens, secretos, PII).
- **Dependencia preventiva** (`jose`, Pino, ORM, etc.) sin un caso de uso documentado.
- **Ignorar `exactOptionalPropertyTypes`**: no asignar `undefined` a propiedades opcionales.

---

## 14. Resumen de cumplimiento

| Regla | Verificación |
| :-- | :-- |
| Una sola Cloud Function HTTP | `src/index.ts` exporta solo `api` |
| Express confinado a Presentation | `grep -rE "from ['\"]express['\"]" src/application src/domain` → vacío |
| Sin SDKs en Application/Domain | `grep -rE "firebase-admin|firebase-functions|resend|@aws-sdk|sharp" src/application src/domain` → vacío |
| Catálogo único de errores | Solo `domain/errors/errorCatalog.ts` define los códigos |
| Estados HTTP solo en Presentation | `STATUS_BY_CODE` en `presentation/errorStatus.ts` |
| Paridad con OpenAPI | `errorCatalog.contract.ts` y `errorStatus.contract.ts` compilan |
| Envelope sin campos extra | `protocol.ts` usa `ApiSuccess`/`ApiFailure` |
| Puertos en Application | `application/ports/*`; adaptadores en `infrastructure/*` |
| Tests | `npm test` 100 % y `npm run test:coverage` ≥ 80 % |
| Sin base local alternativa | Firestore emulador o fakes en memoria |
| Sin `jose` en v1 | `package.json` de functions no lo incluye |
| Sin Pino | logger sobre `firebase-functions/logger` |
