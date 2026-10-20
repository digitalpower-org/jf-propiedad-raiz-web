# Arquitectura del Monorepo

**Proyecto:** Plataforma Web & CMS `jfpropiedadraiz.com`  
**Versión:** 1.0 · 19 de octubre de 2026
**Base:** `./TASKS.md` (decisiones D1–D29, en especial D9, D17, D19, D22, D24, D26–D29) y `./AUTHENTICATION.md`  
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
catalogo_inmobiliaria/
├── packages/
│   ├── shared-types/        # Tipos y contratos compartidos (fuente única de los modelos)
│   │   └── src/
│   │       ├── models/      # Property, Service, contenidos, catálogos cerrados (tipo, amenidades…)
│   │       ├── api/         # DTOs de request/response (PropertyCard, PropertyDetail, errores)
│   │       ├── filters.ts   # Lista de combinaciones de filtros soportadas (ver §5)
│   │       └── errors.ts    # Catálogo de códigos de error estándar
│   ├── functions/           # Backend de dominio (Clean Architecture)
│   │   └── src/
│   │       ├── domain/          # Entidades, reglas e invariantes (sin dependencias de infraestructura)
│   │       ├── application/     # Casos de uso (consulta pública, propiedad, media, correo, traducción)
│   │       ├── infrastructure/  # Repositorios Firestore, R2, Resend, Scheduler
│   │       └── presentation/     # Handlers HTTP, validación de contrato (OpenAPI), mapeo de errores
│   └── client/              # Next.js: UI + BFF
│       └── src/
│           ├── app/             # Rutas (páginas públicas bilingües y /admin)
│           ├── lib/             # Cliente HTTP centralizado, filters.ts (reexporta shared-types), i18n
│           └── server/          # BFF: sesión (cookie), propagación de identidad, X-Internal-Key
├── docs/                    # stories_all.md, DEVELOPMENT-PLAN.md, DEFINITION-OF-DONE.md,
│                            # PERFORMANCE.md, ARCHITECTURE.md, openapi.*.yaml, authentication.md
└── firestore.indexes.json   # Índices compuestos (deben coincidir con §5)
```

Regla de dependencias: `client` y `functions` dependen de `shared-types`; nunca al revés. `shared-types` no importa de `client` ni de `functions`.

---

## 3. Flujo de datos

### 3.1 Lectura pública (catálogo y páginas de contenido)

```
Navegador ──HTTPS──> BFF (Next.js) ──X-Internal-Key──> Functions ──> Firestore
                        │                                   └─────> Cloudflare R2 (URLs de derivados)
                        └── ISR/CDN: la visita normal se sirve de caché y NO ejecuta Functions (US0.3, AC7.4.5)
```

- El BFF nunca usa Firebase Admin (D27).
- Las igualdades del listado y el rango de precio se resuelven en **una sola consulta nativa** de Firestore, ordenada por `createdAt` descendente con desempate por `id` (US1.10). No hay filtrado posterior en Functions (D9).
- `destacada` se envía con un único valor (`true` o `false`, nunca ambos): la portada pide `true` y las pestañas hacen dos consultas, primero `true` y después `false` (D28).
- La paginación es por cursor `{ createdAt, id }` (AC1.10.2).

### 3.2 Autenticación y administración

```
Navegador ──cookie de sesión──> BFF ──propaga X-User-Id/X-User-Role + X-Internal-Key──> Functions
Navegador ──idToken (solo canje)──> BFF ──POST /internal/auth/verify (X-Internal-Key)──> Functions
```

- El **backend** valida el idToken (`verifyIdToken(idToken, true)`) y la lista blanca `authorized_users`; autoriza las rutas de administrador a partir de `X-User-Role` (D27).
- El **BFF** emite y valida su propio JWT de sesión (firma y `exp`) en una cookie; no decide autorización de negocio.

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
| Dominio | Entidades, invariantes y reglas (precio en COP entero, una sola `operacion`, `nuevo` no escribible…) | nada |
| Aplicación | Casos de uso (consulta pública, CRUD de inmuebles, media, correo, traducción) | dominio |
| Infraestructura | Firestore, R2, Resend, Cloud Scheduler | aplicación |
| Interfaces | Handlers HTTP, validación contra las specs OpenAPI, mapeo al catálogo de errores | aplicación |

- Las respuestas de error siguen el catálogo estándar (`VALIDATION_ERROR`, `PERMISSION_DENIED`, etc.), nunca códigos crudos de infraestructura.
- El contrato con el BFF es la spec interna; el contrato con el navegador es la spec pública (D26).

---

## 5. Tabla única de combinaciones de filtros (D17 / AC1.10.4)

Esta es **la única fuente** de las combinaciones de igualdad soportadas por la consulta pública. Debe ser **consistente** con `firestore.indexes.json` y con la lista de `shared-types` reexportada por `packages/client/src/lib/filters.ts` (AC1.10.4). Proviene de D9, US1.10 y US2.2.

**Campos:** igualdades base fijas — `status = ACTIVE`, la `operacion` de la pestaña (`VENTA`, `ALQUILER` o `PROYECTO_SOBRE_PLANOS`) y `destacada` (un solo valor `true`/`false`; nunca ambos). Igualdades opcionales — `tipo`; y `departamento` + `municipio` **juntos** (la ubicación llega hasta municipio, D24). Rango opcional — `precioMin`/`precioMax` sobre `precio`. Orden siempre `createdAt` descendente con desempate por `id`; cursor `{ createdAt, id }`. Los 8 presets resultan de activar o no el rango de precio sobre las 4 combinaciones.

| # | Igualdades (además de `status = ACTIVE`, la operación de la pestaña y `destacada`) | Rango de precio | Índice compuesto en `firestore.indexes.json` |
| :-- | :-- | :-- | :-- |
| C1 | (ninguna) | opcional | `status ASC, operacion ASC, destacada ASC, precio ASC, createdAt DESC, id DESC` |
| C2 | `tipo` | opcional | `status ASC, operacion ASC, destacada ASC, tipo ASC, precio ASC, createdAt DESC, id DESC` |
| C3 | `departamento` + `municipio` | opcional | `status ASC, operacion ASC, destacada ASC, departamento ASC, municipio ASC, precio ASC, createdAt DESC, id DESC` |
| C4 | `tipo` + `departamento` + `municipio` | opcional | `status ASC, operacion ASC, destacada ASC, tipo ASC, departamento ASC, municipio ASC, precio ASC, createdAt DESC, id DESC` |

Notas:

- El rango de precio **no añade una combinación nueva**: comparte el índice (el filtro `>=`/`<=` no cambia los campos indexados); los 8 presets se derivan de activarlo o no sobre las 4 combinaciones.
- `departamento` y `municipio` no se usan por separado: siempre van emparejados (D24).
- Combinación fuera de esta tabla → `422 VALIDATION_ERROR` en el backend (AC1.10.5) y bloqueo previo en el cliente (AC2.2.3); nunca `FAILED_PRECONDITION` ni 500.
- El número de combinaciones de igualdad es **4** y da lugar a los **8 presets** al activar o no el rango de precio: ampliarlo exige actualizar **esta tabla**, `firestore.indexes.json` y `shared-types` a la vez.

**Consulta propia de portada (destacadas):** `status = ACTIVE` + `destacada = true`, orden `fechaPublicacion` desc, hasta 12 (AC1.10.6) → índice `status ASC, destacada ASC, fechaPublicacion DESC, id ASC`.

**Consulta de la tarea «Nuevo» (US1.11):** solo `nuevo == true` (AC1.11.5); no recorre el catálogo.

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
- **TypeScript `strict`**; sin `any` ni `@ts-ignore` (§6 del DoD).
- **Modelo de datos** referenciado desde `./TASKS.md` («MODELO DE DATOS MÍNIMO»); `shared-types` es la implementación.
- **Fuente de alcance y aceptación:** `./TASKS.md`. **Orden y dependencias:** `./DEVELOPMENT-PLAN.md`. **Criterios de cierre:** `./DEFINITION-OF-DONE.md`. **Presupuestos:** `./PERFORMANCE.md`.
- **Secretos:** nunca en texto plano en el repositorio; se inyectan vía **Secret Manager**.
- **Imágenes:** los derivados se generan solo en el backend (AC1.9.21); el navegador solo pre-reduce antes de subir (AC4.2.9); prohibido `/_next/image` (AC7.3.10).
- **Mobile First:** estilos base para 320–414 px y mejora progresiva con `min-width` (US7.1).

---

## 8. Referencias

- Historias y AC: `./TASKS.md` (D1–D29; US0.1, US0.3, US0.4, US0.5, US1.9–US1.11, US4.x, US7.x).
- Contratos: `./openapi.backend.yaml`, `./openapi.bff.yaml` (D26).
- Autenticación: `./AUTHENTICATION.md`.
- Rendimiento: `./PERFORMANCE.md`.
- Índices: `firestore.indexes.json` (debe coincidir con §5).
