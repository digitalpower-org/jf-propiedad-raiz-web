# AGENTS.md — `packages/functions` (backend)

**Ámbito:** solo este paquete. No aplica a `packages/client` ni al BFF.
**Runtime:** Firebase Functions v2 · Node 24 · Express 5 · TypeScript estricto.

Este archivo es la **capa operativa** para agentes: qué mirar, qué no romper y cómo verificar.
No sustituye a la arquitectura; la resume y apunta a ella.

---

## 1. Precedencia de fuentes

1. `docs/BACKEND-ARCHITECTURE.md` — **normativo**.
2. `docs/openapi.backend.yaml` — contrato interno (fuente de verdad de rutas y errores).
3. `docs/DATABASE.md`, `docs/AUTHENTICATION.md`, `docs/DEFINITION-OF-DONE.md`, `docs/QA.md`.
4. Este `AGENTS.md` — operativo.
5. `packages/functions/.opencoderules` — legacy; **no se carga automáticamente** en OpenCode. Si contradice este archivo, gana este archivo.

> **Obsoleto para backend:** `docs/DEVELOPMENT_GUIDE.md` §2 ("exportar la función en `index.ts`"). Contradice la decisión B1: hay **una sola** función `api` y las rutas viven en `presentation/routes.ts`.

---

## 2. Regla de dependencia (no negociable)

| Capa             | Puede importar                                                                  | Prohibido                                             |
| :--------------- | :------------------------------------------------------------------------------ | :---------------------------------------------------- |
| `domain`         | `zod`, utilidades puras                                                         | Express, Firebase, SDKs, capas externas               |
| `application`    | `domain`, `zod`, puertos propios                                                | Express, `firebase-admin`, `firebase-functions`, SDKs |
| `presentation`   | `application`, tipos de `domain`, `express`, `zod`, tipos de `@jf/shared-types` | `infrastructure`, SDKs de persistencia                |
| `infrastructure` | puertos de `application`, SDKs                                                  | `presentation`                                        |

- Dependencias: `Presentation → Application → Domain`; `Infrastructure` implementa los puertos y se inyecta desde `composition.ts`.
- **Excepciones aceptadas:** `src/seed/**` y `src/budget-config.ts` pueden importar `infrastructure` directamente.
- La estructura de §3 del documento es una **guía**, no un contrato rígido. No reorganices carpetas sin aprobación.
- `@jf/shared-types` se importa **solo con `import type`** (D35).

---

## 3. Prohibiciones que rompen el build o la arquitectura

- Más de una Cloud Function HTTP, o `express` fuera de `presentation/`.
- SDKs (`firebase-admin`, `firebase-functions`, `resend`, `@aws-sdk/*`, `sharp`) en `domain/` o `application/`.
- `getAuth()` a nivel de módulo en `presentation/`.
- `any`, `as` para callar tipos, `@ts-ignore`, `@ts-expect-error`.
- Asignar `undefined` a propiedades opcionales (`exactOptionalPropertyTypes`).
- Duplicar el catálogo de errores, el envelope o `STATUS_BY_CODE`.
- `res.status(...).json(...)` repetido en handlers: usa `writeSuccess` / `writeError`.
- Añadir campos al envelope D15 (`path`, `stack`, timestamps, etc.).
- Dependencias preventivas (`jose`, Pino, ORM…) sin caso de uso documentado.

---

## 4. Errores y envelope

- Códigos: `domain/errors/errorCatalog.ts` (15 códigos, **sin** estados HTTP).
- Estado HTTP: **solo** `presentation/errorStatus.ts` (`STATUS_BY_CODE`).
- Paridad de compilación: `domain/errors/errorCatalog.contract.ts` y `presentation/errorStatus.contract.ts`.
- **Contrato actual de `ApiError`:** `new ApiError(code, message, details?)`. No existe todavía un catálogo de mensajes por código.
- **Decisión pendiente (C9):** centralizar los mensajes por defecto en `errorCatalog.ts`; entonces `new ApiError(code)` usará el mensaje del catálogo y `options.message` solo contextualizará. **No la implementes sin pedir aprobación** (es refactor de dominio).
- Estilo de mensajes: español, sin punto final, sin PII, sin stack ni rutas internas.
- `details` estándar: `{ field: string; issue: string }[]` para `VALIDATION_ERROR`; otras formas deben ser explícitas y consistentes.
- El middleware central (`presentation/middlewares/error.ts`) es el único que mapea `ApiError`, `ZodError` y `SyntaxError`.
- `errors.json` es la fuente del catálogo compartido; **nunca** edites `packages/shared-types/src/errors.d.ts` a mano.

Envelope (D15):

```json
{ "success": true, "data": {}, "message": "…" }
{ "success": false, "data": { "code": "…", "details": {}, "requestId": "…" }, "message": "…" }
```

---

## 5. Convenciones de código

- Archivos en **kebab-case**; sufijos por rol: `*.use-case.ts`, `*.repository.ts`, `*.handler.ts`.
- Adaptadores: factory `createX` que devuelve un objeto que cumple el puerto (no clases).
- Handlers: `makeXHandler`. Entidades: clase con constructor privado + factory estático.
- Dominio en español (`Precio`, `Operacion`, `propiedad`); andamiaje técnico en inglés (`UseCase`, `Repository`). **No migres el dominio a inglés** sin aprobación.
- Límites: ≤250 LOC por archivo (excepción heredada: `budget-config.ts`), ≤30 LOC por función, sin parámetros booleanos de control.
- Comentarios solo para explicar el **por qué**, en español.
- Tests: un `it()` = un comportamiento, idealmente <30 LOC. Los archivos de test pueden superar 250 LOC si agrupan casos con `describe`. Helpers sin booleanos de control.
- Zod: valida `body`, `query`, `params` y `headers` en Presentation. `safeParse` solo con una decisión de negocio real.
- VOs y schemas de frontera se definen por separado (forma HTTP vs. invariantes). La normalización canónica ocurre en el `parse` del VO.
- `z.coerce` solo en Presentation; para fechas usa `z.string().datetime().transform(...)`.

---

## 6. Datos (Firestore)

- Colecciones: `properties`, `services`, `authorized_users`. Documento único: **`pages/nosotros`** (no existe colección `about`).
- ID de documento: UUID v4. El `codigo` `JF-XXXX` es un campo de negocio secuencial, **no** el id.
- Los repositorios devuelven entidades/VOs de Domain ya parseados; validan cada documento con Zod en el adaptador.
- Tiempo: puerto `Clock` inyectado (aún no existe; créalo si la tarea lo requiere). No uses `FieldValue.serverTimestamp()` como fuente de tiempo de negocio.
- Soft delete: `status = DELETED`, nunca borrado físico. Consultas públicas filtran `ACTIVE`.
- Concurrencia optimista: `updatedAt` como versión; si no coincide → `409 CONFLICT`.
- Listados: `{ items, nextCursor }`, límite por defecto 12, máximo 50; cursor opaco `{ createdAt, id }`.

---

## 7. Decisiones por implementar (no asumas que existen)

| Área                     | Decisión                                                                                         | Estado       |
| :----------------------- | :----------------------------------------------------------------------------------------------- | :----------- |
| Mensajes de error        | Catálogo de mensajes por código en `errorCatalog.ts`                                             | Pendiente    |
| Validación               | `errorMap` global en `presentation/validation/zodErrorMap.ts`                                    | Pendiente    |
| Tiempo                   | Puerto `Clock` + `createSystemClock`                                                             | Pendiente    |
| Email                    | `EmailSender` (Resend): 3 intentos con backoff, admin → solicitante, `502 EMAIL_DELIVERY_FAILED` | Pendiente    |
| Rate limit               | `RateLimiter`: IP en públicos, `X-User-Id` en admin, 5/min en consignaciones, `429 RATE_LIMITED` | Pendiente    |
| Cobertura                | `coverage.thresholds` al 80 % en `vitest.config.ts`                                              | Pendiente    |
| R2                       | TTL 900 s, MIME jpeg/png/webp, 5 MB, derivados WebP 320/640/1280/2048                            | Parcial      |
| Traducción               | 1 reintento (500 ms); fallo → `enPendiente: true`; no pisar `en` editado a mano; sin caché       | Implementado |
| Limpieza de huérfanos R2 | Job nocturno para `pending/` > 24 h                                                              | No en v1     |

---

## 8. Checklist: añadir un endpoint

1. `docs/openapi.backend.yaml` (contrato primero).
2. `npm run build:types -w @jf/shared-types` (regenera `backend.gen.d.ts`).
3. Si hay código de error nuevo: `domain/errors/errorCatalog.ts` + `packages/shared-types/errors.json` → `npm run sync:errors -w @jf/shared-types` → `npm run check:errors -w @jf/shared-types`.
4. `API_PATHS` en `presentation/paths.ts` (`satisfies ExpressPath`).
5. Puerto en `application/ports/` si hace falta infraestructura nueva.
6. Caso de uso en `application/use-cases/`.
7. Handler en `presentation/handlers/` (`makeXHandler`).
8. Registrar en **tres** sitios: `presentation/routes.ts`, `presentation/handlers/index.ts` y `application/buildUseCases.ts`.
9. Tests: caso de uso con fakes + integración con `supertest` contra `appBuilder`.
10. Docs si aplica.

**Se olvidan sistemáticamente:** el wiring en `routes.ts` / `handlers/index.ts` / `buildUseCases.ts` y el test de integración.

---

## 9. Comandos

| Objetivo                   | Comando                                                                                      |
| :------------------------- | :------------------------------------------------------------------------------------------- |
| Gates desde la raíz        | `npm run lint && npm run format:check && npm run typecheck && npm run test && npm run build` |
| Cobertura backend (≥ 80 %) | `npm run test:coverage -w @jf/functions`                                                     |
| Codegen de contratos       | `npm run build:types -w @jf/shared-types`                                                    |
| Sincronizar errores        | `npm run sync:errors -w @jf/shared-types && npm run check:errors -w @jf/shared-types`        |
| Emuladores backend         | `npm run emulators:be` (raíz)                                                                |
| Build del paquete          | `npm run build -w @jf/functions`                                                             |

- Node: **24** (raíz fija `24.22.1`). Usa siempre `npm`.
- No digas "listo" si falla `typecheck`, `lint`, `test` o la cobertura.
- CI: `.github/workflows/ci.yml` corre 7 gates; la cobertura aún pasa en vacío hasta activar los umbrales.

---

## 10. Git

- Commits: `tipo(scope): descripción en español` (tipos en inglés: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`).
- Ramas: `main` (producción), `dev` (integración), `feature/*`, `fix/*`, `hotfix/*`.
- El PR se abre manualmente y se fusiona a `dev`, nunca directo a `main`.

---

## 11. Límites del agente

- **No** tocar `packages/client` (frontend/BFF).
- **No** cambiar `docs/openapi.backend.yaml` sin aprobación explícita.
- **No** añadir dependencias ni editar `package.json` / `package-lock.json` sin aprobación.
- **No** desplegar (`firebase deploy`, `npm run deploy`).
- **No** editar `firestore.rules` ni `firestore.indexes.json`.
- **No** crear `.env` con secretos ni commitear credenciales.
- **Pedir confirmación** antes de cualquier refactor estructural o migración entre capas.
- Al cerrar una US, actualizar `docs/TODOS.md` con el estado real.

---

## 12. Dónde mirar

| Tema                                              | Documento                      |
| :------------------------------------------------ | :----------------------------- |
| Capas, puertos, Express, errores, testing         | `docs/BACKEND-ARCHITECTURE.md` |
| Rutas, DTOs, estados y códigos                    | `docs/openapi.backend.yaml`    |
| Colecciones, campos, índices, cursor              | `docs/DATABASE.md`             |
| Sesión, `idToken`, lista blanca, `X-Internal-Key` | `docs/AUTHENTICATION.md`       |
| DoD y criterios de aceptación                     | `docs/DEFINITION-OF-DONE.md`   |
| Estado de tareas y responsables                   | `docs/TODOS.md`                |
| Emuladores y variables de entorno                 | `docs/EMULATORS.md`            |
