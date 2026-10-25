# docs/ARCHITECTURE.md
# Arquitectura del Monorepo

**Proyecto:** Plataforma Web & CMS `jfpropiedadraiz.com`  
**Versión:** 1.2 · 22 de octubre de 2026 (stack fijada en §2.1; base D1–D36)
**Base:** `./TASKS.md` (decisiones D1–D36, en especial D9, D17, D19, D22, D24, D26–D36) y `./AUTHENTICATION.md`  
**Naturaleza:** describe la **estructura**, el **flujo de datos** y las **convenciones** del proyecto. Los presupuestos de rendimiento viven en `./PERFORMANCE.md`, no aquí.

---

## 1. Visión general

Plataforma web bilingüe (español de Colombia por defecto, inglés generado o editado manualmente por el admin) con catálogo público, CMS de administración y backend propio, sobre un **monorepo**. El navegador nunca habla con el backend de dominio directamente: pasa siempre por el **BFF** de Next.js.

- **Frontend + BFF:** Next.js (App Hosting de Firebase) — `packages/client`.
- **Backend de dominio:** Functions (Firebase) con Clean Architecture — `packages/functions`.
- **Datos:** Firestore (documentos) y Cloudflare R2 (imágenes, videos referenciados y panorámicas 360°).
- **Correo:** Resend. **Traducción:** Google Cloud Translation, detrás del puerto `Translator`. **Tareas programadas:** Cloud Scheduler.
- **Contratos:** dos specs OpenAPI (D26) — interna (BFF ↔ Functions) y pública (navegador ↔ BFF).

---

## 2. Estructura del monorepo

```
jf-propiedad-raiz-web/
├── .github/workflows/ci.yml  # CI: los 7 gates de ./QA.md §5.1, en orden y en un único job
├── packages/
│   ├── shared-types/        # Tipos y contratos compartidos (fuente única de los modelos)
│   │   ├── presets.json     # Dato empaquetado: combinaciones de filtros soportadas (ver §5)
│   │   ├── errors.json      # Catálogo runtime de códigos de error → estado HTTP (fuente única)
│   │   └── src/
│   │       ├── models/      # Property, Service, contenidos, catálogos cerrados (tipo, amenidades…)
│   │       ├── api/         # DTOs de request/response + *.gen.d.ts generados (backend, bff; D26)
│   │       ├── filters.d.ts # Tipos sobre presets.json (PropertyListFilter, PropertyListState)
│   │       └── errors.d.ts  # Unión de tipos del catálogo de códigos de error
│   ├── functions/           # Backend de dominio (Clean Architecture)
│   │   └── src/
│   │       ├── index.ts         # Entrypoint de deploy (health del walking skeleton, MT0.5)
│   │       ├── health.ts        # Cuerpo tipado del health; consume @jf/shared-types
│   │       ├── domain/          # Entidades, reglas e invariantes (sin dependencias de infraestructura)
│   │       ├── application/     # Casos de uso (consulta pública, propiedad, media, correo, traducción)
│   │       ├── infrastructure/  # Repositorios Firestore, R2, Resend, Scheduler
│   │       └── presentation/     # Handlers HTTP, validación de contrato (OpenAPI), mapeo de errores
│   └── client/              # Next.js: UI + BFF
│       ├── messages/        # Diccionarios es.json / en.json (US0.4, D36)
│       └── src/
│           ├── app/             # Rutas (páginas públicas bilingües y /admin) + app/api/ (18 route handlers del BFF)
│           ├── lib/             # Cliente HTTP centralizado (api.ts), filters.ts (reexporta presets), whatsapp.ts (D35)
│           ├── i18n/            # Rutas por idioma (routes.ts), negociación Accept-Language, carga de diccionarios
│           ├── proxy.ts         # Cierre de la superficie (404/405, D32); no autentica
│           └── server/          # BFF: catálogo generado (routes.ts), matcher path-first (match-route.ts), sesión, X-Internal-Key
├── docs/                    # TASKS.md, PRD.md, ARCHITECTURE.md, AUTHENTICATION.md, DATABASE.md,
│                            # DESIGN-SYSTEM.md, DEVELOPMENT-PLAN.md, DEFINITION-OF-DONE.md,
│                            # PERFORMANCE.md, QA.md, openapi.backend.yaml, openapi.bff.yaml
├── .opencoderules           # Reglas del repo (TypeScript estricto, cero any, gates)
├── .prettierignore          # Excluye docs/, artefactos generados (lib/, test-results/)
├── lighthouserc.json        # Lighthouse CI móvil (PERFORMANCE.md §1/§2); informativo hasta MT6.2
├── scripts/                 # analyze-bundle.mjs (presupuesto de bytes, AC7.2.2)
├── package.json             # Raíz del monorepo: workspaces + orquestación npm (lint, gates)
└── firestore.indexes.json   # Índices compuestos (deben coincidir con §5)
```

Regla de dependencias: `client` y `functions` dependen de `shared-types`; nunca al revés. `shared-types` no importa de `client` ni de `functions`.

### 2.1 Stack fijada

Versiones con las que se desarrolla el proyecto. La **major de Next.js es un requisito de diseño, no una preferencia**: en Next 16 la convención `middleware` se renombró a `proxy`, y de ahí que el **cierre de superficie** (404/405) viva en `packages/client/src/proxy.ts` (§3.2); la sesión se valida en el route handler (D32). El patch de Next se actualiza por routine; la major, no.

| Pieza | Versión fijada | Dónde se fija | Nota |
|---|---|---|---|
| Next.js | `16.3.8` | `packages/client/package.json` | Major **16** = requisito de diseño (convención `proxy`). Patch actualizable dentro de 16.x por routine. |
| eslint-config-next | `16.3.8` | `packages/client/package.json` | Fijado junto a Next para no mezclar reglas de lint entre majors. |
| React / React DOM | `19.2.8` | `packages/client/package.json` | |
| Mantine (`core`, `form`, `hooks`) | `^9.7.0` | `packages/client/package.json` | Sin Tailwind: CSS Modules + `postcss-preset-mantine`. |
| TanStack Query | `^5.0.0` | `packages/client/package.json` | Único cliente de datos del frontend. |
| next-intl | `4.14.9` | `packages/client/package.json` | i18n de US0.4 (D36); sin middleware, idioma por segmento `[locale]`. |
| server-only | `0.0.1` | `packages/client/package.json` | Impide que la carga de diccionarios entre en el bundle de cliente (AC7.2.4). |
| Zod | `^4.0.0` | `client` y `functions` | Validación de contrato en ambos planos. |
| TypeScript | `^5` | los tres packages | `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`; sin `any`. |
| Node.js | `24` | raíz (`engines.node`) y `packages/functions` | `packageManager: npm@11.19.0`; el repo no arranca con Node 20. |
| Vitest | `^4.0.0` | `client` y `functions` | |
| Playwright | `^1.50.0` | `packages/client` | E2E; requiere `npx playwright install chromium`. |
| firebase-admin / firebase-functions | `^13.6.0` / `^7.0.0` | `packages/functions` | |
| sharp | `^0.34.0` | `packages/functions` | Procesamiento de imágenes. |
| resend | `^6.0.0` | `packages/functions` | Envío de correo. |
| @google-cloud/translate | `^10.3.0` | `packages/functions` | Detrás del puerto `Translator`. |
| openapi-typescript | `^7.0.0` | `packages/shared-types` | Genera `src/api/*.gen.d.ts` desde las dos specs (D26). |
| Prettier | `^3.0.0` | raíz | Formato; `docs/` está excluido (`.prettierignore`). |
| @lhci/cli | `^0.15.0` | raíz | Lighthouse CI (presupuestos en `./PERFORMANCE.md`). |

**Regla de bloqueo de major:** actualizar el patch de Next (16.3.8 → 16.x) es routine. Saltar de major (16 → 17) **exige** revisar `packages/client/src/proxy.ts`, sus 404/405 y sus tests (AC0.1.6); la sesión se valida en el route handler (D32), porque la convención de archivo y el contrato del Proxy son parte del diseño, no un detalle de implementación.

---

## 3. Flujo de datos

### 3.1 Lectura pública (catálogo y páginas de contenido)

```
Navegador ──HTTPS──> BFF (Next.js) ──X-Internal-Key──> Functions ──> Firestore
                        │                                   └─────> Cloudflare R2 (URLs de derivados)
                        └── ISR/CDN: la visita normal se sirve de caché y NO ejecuta Functions (US0.3, AC7.4.5)
```

- El BFF nunca usa Firebase Admin (D27).
- Las igualdades del listado y el rango de precio se resuelven en **una sola consulta nativa** de Firestore, ordenada por `createdAt` descendente con desempate por `id` (US1.10); el caso **con rango de precio** está **PENDIENTE de validación en el emulador** (ver §5). No hay filtrado posterior en Functions (D9).
- `destacada` se envía con un único valor (`true` o `false`, nunca ambos): la portada pide `true` y las pestañas hacen dos consultas, primero `true` y después `false` (D28).
- La paginación es por cursor `{ createdAt, id }` (AC1.10.2).

### 3.2 Autenticación y administración

```
Navegador ──cookie de sesión──> BFF ──propaga X-User-Id/X-User-Role + X-Internal-Key──> Functions
Navegador ──idToken (solo canje)──> BFF ──POST /internal/auth/verify (X-Internal-Key)──> Functions
```

- El **backend** valida el idToken (`verifyIdToken(idToken, true)`) y la lista blanca `authorized_users`; autoriza las rutas de administrador a partir de `X-User-Role` (D27).
- El **BFF** emite y valida su propio JWT de sesión (firma, claims y tiempos, D34) en la cookie `__session`; la validación vive en el **envoltorio del route handler** (D32), no en el Proxy, y no decide autorización de negocio.
- El **Proxy** (`packages/client/src/proxy.ts`) cierra la superficie pública **antes** del router de Next.js: rutas no declaradas responden `404 NOT_FOUND`, métodos no permitidos responden `405 METHOD_NOT_ALLOWED` con cabecera `Allow` (ambos con la envoltura estándar; nunca HTML ni cuerpo vacío). La resolución es *path-first* como en el router de Next.js (el segmento literal gana al dinámico y el método se comprueba después), de modo que no se filtran rutas por método incorrecto. **No** valida la cookie: la autenticación es del handler (D32).
- El **cliente HTTP** (`packages/client/src/lib/api.ts`) es el punto único de consumo desde el navegador: normaliza cualquier respuesta a la envoltura de éxito o lanza `ApiError` con `code`, `status` y `requestId`. Las respuestas fuera de contrato (HTML, cuerpo vacío, JSON inválido) se degradan a `INTERNAL` sin filtrar el cuerpo crudo; los fallos de red se reportan con `status: 0`.

### 3.3 Escritura de contenido y traducción

```
/admin (BFF) ──X-User-Role + X-Internal-Key──> Functions
    ├── Firestore (Property/Service)
    ├── R2 (derivados: el navegador sube la foto ya pre-reducida, AC4.2.9)
    └── Traducción ES→EN selectiva por campo al guardar (US0.5) + escritura manual de `en` ──> dispara revalidación ISR (US0.3)
```

- El backend traduce solo los campos con `autoTranslate` activo (activado por defecto, configurable por campo en el editor de inmuebles) y acepta la escritura manual de `en` por el admin (US0.5).

---

## 4. Capas del backend (Clean Architecture)

| Capa | Contenido | Depende de |
| :---- | :---- | :---- |
| Dominio | Entidades, invariantes y reglas (precio en COP entero, una sola `operacion`…) | nada |
| Aplicación | Casos de uso (consulta pública, CRUD de inmuebles, media, correo, traducción) | dominio |
| Infraestructura | Firestore, R2, Resend, Cloud Scheduler | aplicación |
| Interfaces | Handlers HTTP, validación contra las specs OpenAPI, mapeo al catálogo de errores | aplicación |

- Las respuestas de error siguen el catálogo estándar (`VALIDATION_ERROR`, `PERMISSION_DENIED`, etc.), nunca códigos crudos de infraestructura.
- El contrato con el BFF es la spec interna; el contrato con el navegador es la spec pública (D26).

---

## 5. Tabla única de combinaciones de filtros (D17 / AC1.10.4)

Esta es **la única fuente** de las combinaciones de filtros soportadas por la consulta pública. Debe ser **consistente** con `firestore.indexes.json` y con la lista de `shared-types` reexportada por `packages/client/src/lib/filters.ts` (AC1.10.4). Proviene de D9, D28, US1.10 y US2.2.

**Campos:** igualdades base fijas — `status = ACTIVE`, la `operacion` de la pestaña (`VENTA`, `ALQUILER` o `PROYECTO_SOBRE_PLANOS`) y `destacada` (un solo valor `true`/`false`; nunca ambos). Igualdades opcionales — `tipo`; y `departamento` + `municipio` **juntos** (la ubicación llega hasta municipio, D24). Rango opcional — `precioMin`/`precioMax` sobre `precio`. Orden siempre `createdAt` descendente con desempate por el id del documento (en el índice se usa `__name__`, porque el campo `id` no está almacenado en Firestore); cursor `{ createdAt, id }`. Los **8 presets** (D28) son la base (1) combinada con los tres opcionales: rango de `precio` (2), `tipo` (3) y `departamento`+`municipio` (4) → `1`, `1+2`, `1+3`, `1+4`, `1+2+3`, `1+2+4`, `1+3+4`, `1+2+3+4`.

| # | Preset (D28) | Igualdades opcionales | Rango de precio | Índice compuesto exacto en `firestore.indexes.json` |
| :-- | :-- | :-- | :-- | :-- |
| 1 | `1` | (ninguna) | no | `status ASC, operacion ASC, destacada ASC, createdAt DESC, __name__ DESC` |
| 2 | `1+2` | (ninguna) | sí | `status ASC, operacion ASC, destacada ASC, precio ASC, createdAt DESC, __name__ DESC` |
| 3 | `1+3` | `tipo` | no | `status ASC, operacion ASC, destacada ASC, tipo ASC, createdAt DESC, __name__ DESC` |
| 4 | `1+4` | `departamento` + `municipio` | no | `status ASC, operacion ASC, destacada ASC, departamento ASC, municipio ASC, createdAt DESC, __name__ DESC` |
| 5 | `1+2+3` | `tipo` | sí | `status ASC, operacion ASC, destacada ASC, tipo ASC, precio ASC, createdAt DESC, __name__ DESC` |
| 6 | `1+2+4` | `departamento` + `municipio` | sí | `status ASC, operacion ASC, destacada ASC, departamento ASC, municipio ASC, precio ASC, createdAt DESC, __name__ DESC` |
| 7 | `1+3+4` | `tipo` + `departamento` + `municipio` | no | `status ASC, operacion ASC, destacada ASC, tipo ASC, departamento ASC, municipio ASC, createdAt DESC, __name__ DESC` |
| 8 | `1+2+3+4` | `tipo` + `departamento` + `municipio` | sí | `status ASC, operacion ASC, destacada ASC, tipo ASC, departamento ASC, municipio ASC, precio ASC, createdAt DESC, __name__ DESC` |

Notas:

- **PENDIENTE (validar en el emulador):** Firestore exige que el **primer `orderBy`** sea sobre el **mismo campo** del filtro de rango (`>=`/`<=`); por eso la consulta con `precio` + `orderBy(createdAt)` de AC1.10.2 puede ser rechazada o exigir ordenar primero por `precio` (choque con AC1.10.7). Los 8 presets y sus 8 índices se mantienen **tal como están** (D28/AC1.10.4); el orden exacto de la consulta con rango se confirma en el emulador antes de cerrar US1.10.
- Un preset = un índice: el rango de precio **no comparte** índice con el mismo preset sin precio (AC1.10.4: igualdades, luego `precio` y por último `createdAt desc, __name__ desc`), y el preset sin precio necesita su propio índice sin la columna `precio`.
- `departamento` y `municipio` no se usan por separado: siempre van emparejados (D24).
- Combinación fuera de esta tabla → `422 VALIDATION_ERROR` en el backend (AC1.10.5) y bloqueo previo en el cliente (AC2.2.3); nunca `FAILED_PRECONDITION` ni 500.
- Ampliar los presets exige actualizar **esta tabla**, `firestore.indexes.json` y `shared-types` a la vez (AC1.10.4).

**Consulta propia de portada (destacadas):** `status = ACTIVE` + `destacada = true`, orden `fechaPublicacion` desc, hasta 12 (AC1.10.6) → índice nº 9: `status ASC, destacada ASC, fechaPublicacion DESC, __name__ ASC`.

**Consulta de la insignia «Nuevo» (US1.11):** se evalúa en el frontend con `isNewProperty(createdAt)`; no hay campo `nuevo` ni consulta en backend.

---

## 6. Internacionalización por rutas (US0.4)

- Español de Colombia (`es-CO`, por defecto) e inglés (`en`), bajo `/es/...` y `/en/...`.
- Rutas localizadas por segmento (no por query): `venta/sale`, `alquiler/rent`, `proyectos/projects`, `servicios/services`, `nosotros/about-us`, `propiedad/property/[slug]`, `consigne-su-propiedad/list-your-property`, `contacto/contact`, y las legales (`aviso-de-privacidad/privacy-notice`, `politica-de-tratamiento-de-datos/data-processing-policy`, `terminos/terms`).
- La estructura de rutas se construye **una sola vez** (US0.4); cambiarla después reescribe todo.
- Los admins escriben solo en español; el inglés se genera al guardar (US0.5). El panel `/admin` es solo en español.
- El bundle sirve **solo** el diccionario del idioma activo (AC7.2.4).

---

## 7. Convenciones transversales

- **npm** únicamente (sin otros gestores).
- **TypeScript `strict`** + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` (reglas `.opencode rules`); sin `any` ni `@ts-ignore` (§6 del DoD).
- **Modelo de datos** referenciado desde `./TASKS.md` («MODELO DE DATOS MÍNIMO»); `shared-types` es la implementación.
- **Fuente de alcance y aceptación:** `./TASKS.md`. **Orden y dependencias:** `./DEVELOPMENT-PLAN.md`. **Criterios de cierre:** `./DEFINITION-OF-DONE.md`. **Presupuestos:** `./PERFORMANCE.md`.
- **Secretos:** nunca en texto plano en el repositorio; se inyectan vía **Secret Manager**.
- **Imágenes:** los derivados se generan solo en el backend (AC1.9.21); el navegador solo pre-reduce antes de subir (AC4.2.9); prohibido `/_next/image` (AC7.3.10).
- **Mobile First:** estilos base para 320–414 px y mejora progresiva con `min-width` (US7.1).
- **Node.js:** la versión oficial del proyecto es **Node 24** (producción, App Hosting, CI y desarrollo local), fijada con `.nvmrc` (`nvm use`) y declarada en `engines` de la raíz y de `packages/functions` (`"node": "24"`).
- **Nombres de paquetes (workspaces npm):** `@jf/shared-types`, `@jf/client`, `@jf/functions`; los scripts de un paquete se ejecutan con `npm run <script> -w <paquete>`.
- **Rutas del BFF:** siempre bajo `/api/*`, y **declaradas una a una** —sin *catch-all*— para que el router de Next.js sea la allowlist (*fail-closed*, D31). Por convención la ruta pública `/api/<x>` reenvía a la interna `/api/v1/<x>`; las excepciones se declaran en la operación con `x-bff-internal-path` (ruta interna literal, o `null` si la resuelve el BFF):
  - `/api/auth/*` — sesión: `POST /api/auth/session` (reenvía a `POST /internal/auth/verify`), `POST /api/auth/logout` y `GET /api/auth/me` (locales, sin reenvío).
  - `/api/properties*`, `/api/services*`, `/api/media/*`, `/api/consignments`, `/api/about` — superficie pública de datos y acciones (AC0.2.1), con o sin sesión según el catálogo.
  - `/api/revalidate` — **ruta del BFF** consumida *server-to-server* por Cloud Functions mediante webhook interno autenticado por `X-Internal-Key`; se documenta en el tag `Internal` de `./openapi.bff.yaml` (AC0.3.1/D26).
  - El **mapeo** ruta pública ↔ ruta interna y la **política de sesión** (qué rutas exigen cookie) viven en un único módulo, `packages/client/src/server/routes.ts`, **generado** desde `./openapi.bff.yaml` (`gen:routes`, AC0.1.8): la spec es la fuente y el catálogo se deriva de ella, así que no pueden divergir.
- **Planos del backend:** `/api/v1/*` es la API de dominio versionada (siempre con identidad propagada `X-User-*`); `/internal/*` es el plano **entre planos**, sin versionar, para la verificación de sesión (`POST /internal/auth/verify`) y **nunca alcanzable desde el navegador** (D30).
- **`shared-types`:** paquete **sin código ejecutable** (solo `.d.ts` y datos JSON de solo lectura: `presets.json` y `errors.json`; sin `main`/`exports` de runtime); `functions` lo consume vía `paths` en su `tsconfig` y **sin** dependencia npm (requisito de despliegue de Firebase); `client` lo consume como dependencia de workspace y reexporta los presets desde `src/lib/filters.ts` (import profundo `@jf/shared-types/presets.json`, con `presets.json` en la raíz del paquete); `npm run build:types` genera `src/api/backend.gen.d.ts` y `src/api/bff.gen.d.ts` a partir de las dos specs (D26). El único helper de runtime compartido, `buildWhatsAppUrl`, **no** vive aquí: está en `packages/client/src/lib/whatsapp.ts` (D35).
- **Configuración Auth en `firebase.json`:** la sección `auth` (proveedores `emailPassword`, `googleSignIn.supportEmail`) es configuración que **`firebase deploy` publica en el proyecto** (no es exclusiva del emulador). `emailPassword: true` se mantiene **intencionalmente**: además del login de producto (Google + lista blanca, US1.1) se usan usuarios de **desarrollo** con correo y contraseña.

---

## 8. Referencias

- Historias y AC: `./TASKS.md` (D1–D36; US0.1, US0.3, US0.4, US0.5, US1.9–US1.11, US4.x, US7.x).
- Contratos: `./openapi.backend.yaml`, `./openapi.bff.yaml` (D26).
- Autenticación: `./AUTHENTICATION.md`.
- Rendimiento: `./PERFORMANCE.md`.
- Índices: `firestore.indexes.json` (debe coincidir con §5).
