# TODOS — Seguimiento de progreso (split por desarrollador)

> **Proyecto:** jfpropiedadraiz.com · **Fuente de alcance:** `docs/DEVELOPMENT-PLAN.md` y `TASKS.md` (decisiones D1–D36).
> Este archivo solo registra **estado**. Para detalle, criterios de aceptación y justificaciones, consultar el plan y `TASKS.md`.

## Reglas para agentes

1. Marcar `[x]` solo cuando se cumpla el DoD de ese nivel (`docs/DEFINITION-OF-DONE.md`): historia (US) o macro tarea (MT).
2. Una MT se marca completa solo cuando **todas** sus historias (US) están marcadas y sus dependencias (`←`) están cerradas.
3. No iniciar una MT con dependencias abiertas. No editar el plan ni `TASKS.md` desde aquí; cualquier cambio de alcance se hace primero en esos documentos.
4. `COULD` = diferible: no bloquea el release ni a MT6.2.
5. Las prioridades `MUST`/`SHOULD` de cada historia están en `TASKS.md`.
6. **Responsables:** `[D1]` = Dev 1 (backend/BFF/Functions + route handlers `packages/client/src/app/api/**`, `packages/client/src/server/**`, `packages/client/src/proxy.ts`), `[D2]` = Dev 2 (frontend/Next.js UI: páginas `app/[locale]/**`, componentes cliente, formularios UI), `[D1+D2]` = mixto (coordinar).

**Asignación base (según `docs/DEVELOPMENT-PLAN.md`):** Dev 1 → MT1.1, MT1.2, MT1.4, MT2.1, MT2.2, MT3.1 (incluye todo el BFF en `packages/client`). Dev 2 → MT0.4 (UI/i18n routing), MT1.3, MT2.3, MT3.2, MT4.1 (UI), MT4.2 (UI), MT5.1, MT5.2. Otras MTs se asignan por componentes (BFF/server → D1, UI → D2).

**Cadena crítica:** MT0.1 → MT0.2 → MT0.4 → MT0.5 → MT1.1 → MT1.2 → MT2.1 → MT2.2 → MT2.3 → MT4.1 → MT4.2 → MT5.1 → MT6.1 → MT6.2

---

## FASE 0 — Habilitadores

- [x] **MT0.1** `[D1+D2]` Planificación, proceso y decisiones (DoD, ramas, commits, QA, flujos de auth) ← —
- [x] **MT0.2** `[D1+D2]` Repositorio y tooling (monorepo, lint/format, CI con 7 gates) ← MT0.1
- [ ] **MT0.3** `[D1]` Infraestructura, cuentas y entornos (Firebase Blaze, R2, Resend, Translation, Secret Manager → .env, Scheduler eliminado, alerta presupuesto pendiente) ← MT0.1
  **GAP:** Firebase Blaze plan no provisionado (requerido para App Hosting en producción). R2, Translation y Secret Manager no están configurados en el proyecto real. Resend tiene API key real en `packages/functions/.env` (gitignored) con entrega verificada en local por BFF (`:5002/api/consignments`) y backend directo (`:5001/.../api/v1/consignments`), con evidencia manual de dominio verificado con SPF/DKIM para `consignaciones@jfpropiedadraiz.com` (AC3.2.6) registrada por Daniel Pacheco el 2026-11-23, pero falta el secreto en producción. CI usa clave falsa por diseño. Alerta de presupuesto pendiente. Sin estas cuentas, MT0.5 y MT1.5 no pueden desplegarse.
- [x] **MT0.4** `[D1+D2]` Andamiaje técnico: contratos y base i18n ← MT0.2
  - [x] US0.1 `[D1]` Contrato API (2 OpenAPI), `shared-types`, catálogo de errores y helper `buildWhatsAppUrl` (D35)
  - [x] US0.4 `[D2]` Internacionalización por rutas `/es` y `/en`
  - [x] US7.6 `[D1+D2]` (arranque) Playwright móvil/escritorio, `lighthouserc.json`, análisis de bundles (gates informativos)
- [x] **MT0.5** `[D1]` Esqueleto desplegable (App Hosting + Functions + Firestore, health + función trivial) ← MT0.3, MT0.4
  - Emulators: `firebase emulators:start --only apphosting,firestore,functions,auth` levanta exitosamente
  - Health: Endpoints `/health` (Functions) y health check BFF probados con éxito
  - `apphosting.yaml`: creado en raíz, compatible con `firebase.json` sin conflictos
  - Datos seed: persisten en `/home/daniel/.firebase/emulators/`, volatilidad conocida (usar `--import/--export` para fijar)

> **Hito 0:** repo, CI, Firebase/emuladores, cuentas, secretos, alerta de presupuesto, contratos, i18n base y esqueleto desplegado.

---

## OLA 1 — Núcleo: autenticación, BFF y operación base

- [x] **MT1.1** `[D1]` BFF y seguridad interna ← MT0.3, MT0.4, MT0.5
  - [x] US0.2 `[D1]` BFF de Next.js, `routes.ts` generado, `proxy.ts` (404/405), `X-Internal-Key`
- [x] **MT1.2** `[D1+D2]` Autenticación end-to-end (incluye seed de `authorized_users`) ← MT1.1, MT0.3
  - Evidencia: `POST /api/auth/logout` → 204 + cookie `__session` borrada; `admin/(protected)/` creado con guard servidor (`force-dynamic` + cookie); `e2e/auth-session.spec.ts` creado; seed verificado (63 tests functions). E2E verificado: `POST /api/auth/session` → 200 + `Set-Cookie __session` para `admin@test.local`; guard de `/es/admin` sin cookie redirige a `/es/admin/login`; guard de `/es/admin` con cookie válida → 200 admin HTML.
  - [x] US1.1 `[D1]` Lista blanca verificada por el backend
  - [x] US1.2 `[D1]` `POST /api/auth/session` (BFF route handler)
  - [x] US1.3 `[D1]` Guard y propagación de identidad (`X-User-*`) (BFF)
  - [x] US1.4 `[D1]` `POST /api/auth/logout` (BFF route handler)
  - [x] US1.5 `[D1+D2]` Front: ciclo de sesión, renovación, protección de `/admin`
    - Evidencia: `lib/firebase-client.ts`; `lib/auth-session.ts` (single-flight `renewSession`); `admin/login/page.tsx` (Google sign-in); `admin/(protected)/layout.tsx` (guard servidor); `auth-renew.ts` borrado; `package.json` +firebase; tipo esperado (tsc) por falta de install.
    - [x] `[D2]` UI/guard cliente: rutas `/admin/**`, layout/guard, Firebase Auth (`signInWithPopup`/`getIdToken`), renovación single-flight ante 401 y redirección al login (AC5.4.7)
    - [x] `[D1]` Endpoints BFF: `/api/auth/session`, `/api/auth/me`, `/api/auth/logout` + JWT `__session` + propagación `X-User-*`
    - [x] `[D2]` UI/guard cliente: rutas `/admin/**`, layout/guard, Firebase Auth (`onAuthStateChanged`/`onIdTokenChanged`), renovación single-flight ante 401 y redirección al login (AC5.4.7) — completado; revertido `00ffbef` (redirect temporal a `/es/`) y verificado E2E `admin-guard` + `auth-session`
  - [x] US1.6 `[D1]` `GET /api/auth/me` (BFF route handler)
- [x] **MT1.3** `[D2]` Fundamentos de front compartidos ← MT0.4
  - [x] US5.4 `[D2]` Cliente HTTP centralizado y `ApiError` (evidencia: `lib/api-error.ts` + `lib/http-client.ts`; duplicado corregido; `ErrorBoundary` stub creado)
- [ ] **MT1.4** `[D1]` Revalidación y traducción ← MT1.1, MT0.3
  **GAP:** Revalidación cableada y probada en integración para las 5 escrituras de inmueble (crear, actualizar, activar, ocultar, borrado lógico). Traducción create/update de inmuebles, servicios y Nosotros cableada y probada con tests unitarios de handler y de integración HTTP (`translateContentFields` + revalidación). Pendiente para US0.5: UI del editor con indicador por campo, interruptor global y botón «Reintentar traducción» (AC0.5.6, AC4.1.4); la MT sigue abierta hasta esa UI y su E2E.
  - [x] US0.3 `[D1]` Revalidación bajo demanda
  - [ ] US0.5 `[D1]` Traducción ES→EN selectiva por campo + edición manual
  **Nota:** AC0.5.5 quedó formalizado con D38 (`docs/TASKS.md`): `enPendiente: true` por campo en `Translatable` es la forma oficial de indicar traducción pendiente, equivalente a la bandera global `traduccionPendiente: true` del texto original. No se añade el campo global a `docs/openapi.backend.yaml` ni a `shared-types`.
- [x] **MT1.5** `[D1]` Operación base y despliegue temprano ← MT0.5, MT1.1, MT1.4
  - [x] US6.1 `[D1]` (andamiaje) Datos de ejemplo reproducibles ← Paquete: `packages/functions/src/seed/sample-data.ts`
  - [x] US6.2 `[D1]` Costos y presupuesto bajo control ← Paquete: `packages/functions/src/budget-config.ts`
  - [x] US6.3 `[D1]` (despliegue temprano) ← Paquete: `packages/functions/src/seed/early-deployment.ts`

---

## OLA 2 — Dominio backend y catálogo público

- [x] **MT2.1** `[D1]` Dominio de inmuebles y media ← MT1.1, MT1.2, MT1.4, MT0.3
  - [x] US1.7 `[D1]` Ciclo de vida del inmueble y código secuencial
  - [x] US1.8 `[D1]` URLs presignadas de R2
  - [x] US1.9 `[D1]` Confirmación de subida y derivados
- [x] **MT2.2** `[D1]` Consulta pública y vigencia ← MT2.1, MT1.2, MT1.4, MT0.3
  - [x] US1.10 `[D1]` Consulta pública (filtros, orden, cursor, índices)
  - [x] US1.11 `[D1]` Bandera «Nuevo» (tarea programada) — ACs son de frontend (`isNewProperty(createdAt)` en UI); backend ya expone `createdAt` en la respuesta
  - [x] US7.4 `[D1]` (backend) `PropertyCard` tipos en `shared-types` ya existen (AC7.4.1); compresión/caché son de infraestructura
- [x] **MT2.4** `[D1]` Seed de catálogo ← MT2.1, MT2.2
  - [x] US6.1 `[D1]` (catálogo) Inmuebles, servicios y Nosotros; idempotente, traductor falso
- [x] **MT2.3** `[D2]` Catálogo público (UI) ← MT2.2, MT2.4, MT1.3, MT0.4  ← MT2.2 bloquea MT2.3 — sin backend de consulta pública, el catálogo usa mocks  ← MT2.4 (seed de catálogo) es prerequisito para datos reales
  - [x] **US2.1** `[D2]` Pestañas independientes
  - [x] **US2.2** `[D2]` Buscador, skeletons y estados de carga
  - [x] **US2.3** `[D2]` Scroll infinito
  - [x] **US2.4** `[D2]` Ficha técnica con SEO y puntos de interés
  - [x] **US2.5** `[D2]` Botón de WhatsApp (usa `buildWhatsAppUrl`)
  - [x] **US2.6** `[D2]` Portada (Home)
  - [x] **US2.7** `[D2]` SEO técnico (parte inmuebles del sitemap)
  - [x] **US7.1** `[D2]` Interfaz Mobile First
  - [x] **US7.3** `[D2]` Imágenes y multimedia bajo demanda
  - [x] **US7.4** `[D2]` (cliente) API y caché eficientes
- [x] **MT3.2** `[D2]` Páginas legales (adelantadas a Ola 2) ← MT0.4, MT1.4
  - [x] US5.3 `[D2]` Aviso de privacidad, tratamiento de datos y términos

---

## OLA 3 — Consignación y correo

- [ ] **MT3.1** `[D1+D2]` Consignación end-to-end ← MT1.1, MT1.3, MT3.2, MT0.4, MT0.3
  - [ ] US3.1 `[D1+D2]` Formulario «Consigne su Propiedad»
    - [x] `[D1]` Endpoint BFF/Functions `POST /api/consignments` (integración Resend, validación, límite de envíos)
    - [x] `[D2]` UI formulario `app/[locale]/consignar` (campos, consentimiento, manejo 429/422/500)
  - [x] US3.2 `[D1]` Notificación por correo con Resend (BFF/Functions)
    - **Nota:** Evidencia local 23 nov 2026: `POST /api/consignments` vía BFF en `:5002` y `POST /api/v1/consignments` directo en `:5001` → `200` con correos recibidos por admin y solicitante; honeypot → `200`/`enviado:false`; 6.º envío → `429`; `CONSENT_REQUIRED`, `VALIDATION_ERROR`, `VALIDATION_ERROR` por falta de `X-Client-IP`, `401` por clave inválida y `405` por GET verificados.
    - **Evidencia AC3.2.6:** Daniel Pacheco, 2026-11-23T18:44:10Z; Resend muestra DNS y dominio verificados el 12 nov 2026 (`docs/reports/resend-evidencia.png`). `GET /domains/{domain_id}` devuelve `jfpropiedadraiz.com` con `status=verified`, DKIM `resend._domainkey` TXT `verified`, SPF `rsend` y `send` CNAME `verified`; correo recibido por admin con `SPF_PASS`, `DKIM_VALID_AU`, `DKIM_VALID` y `d=jfpropiedadraiz.com`. US3.2 cerrada.
  - [x] US3.3 `[D2]` Consentimiento de tratamiento de datos (UI)
  - [x] US3.4 `[D1]` Protección contra bots y límite de envíos (BFF/Functions)

---

## OLA 4 — CMS y gestión

- [ ] **MT4.1** `[D1+D2]` CMS de inmuebles y media ← MT2.1, MT1.4, MT1.3, MT1.2, MT2.3
  - [ ] US4.1 `[D1+D2]` CRUD de inmuebles
    - [x] `[D1]` BFF/Functions CRUD (`/api/properties`, dominio, validación, transiciones) — evidencia `edff459` + tests integración
    - [ ] `[D2]` UI panel `/admin/inmuebles` (listado, formulario, guardar)
  - [ ] US4.2 `[D1+D2]` Uploader de fotos con reordenamiento y portada
    - [x] `[D1]` Presigned URL + confirmación R2 (`/api/media/presigned-url`, `/api/media/confirm`) — evidencia `edff459` + tests integración
    - [ ] `[D2]` Uploader UI (drag&drop, reordenamiento, portada)
  - [ ] US4.3 `[D1+D2]` Videos y panorámicas 360°
    - [x] `[D1]` Endpoints/media BFF/Functions — evidencia `edff459` + tests integración
    - [ ] `[D2]` UI panel añadir videos/panorámicas 360°
  - [ ] US7.4 `[D2]` (panel) TanStack Query, debounce, timeouts
  - [ ] US7.5 `[D2]` Panel y subidas con datos móviles
- [ ] **MT4.2** `[D1+D2]` CMS de contenido ← MT1.4, MT1.3, MT1.2, MT4.1
  - [ ] US4.4 `[D1+D2]` Gestión de Servicios
    - [x] `[D1]` CRUD BFF/Functions Servicios
    - [ ] `[D2]` UI panel `/admin/servicios`
  - [ ] US4.5 `[D1+D2]` Gestión de la página «Nosotros»
    - [x] `[D1]` CRUD BFF/Functions Nosotros
    - [ ] `[D2]` UI panel `/admin/nosotros`
  - [ ] US7.1 `[D2]` (panel) Mobile First
  - [ ] US7.5 `[D2]` (listas y borradores)

---

## OLA 5 — Contenido público y contacto

- [x] **MT5.1** `[D1+D2]` Páginas públicas de contenido ← MT2.2, MT2.4, MT2.3, MT0.4
  - [x] **US5.1** `[D2]` Índice y páginas de Servicios (UI)
  - [x] **US5.2** `[D2]` Pie de página y Contacto (UI)
  - [x] **US5.6** `[D2]` Página «Nosotros» (UI)
  - [x] **US7.1** `[D2]` (contacto) Mobile First
  - [x] **US2.7** `[D1]` (cierre) Sitemap completo (Servicios, Nosotros y legales) (BFF/Functions)
- [ ] **MT5.2** `[D1+D2]` Contacto editable `COULD` ← MT4.2
  - [ ] US5.5 `[D1+D2]` Configuración de contacto desde el panel
    - [ ] `[D1]` CRUD BFF/Functions contacto editable
    - [ ] `[D2]` UI panel `/admin/contacto`

---

## OLA 6 — Operación y cierre

- [ ] **MT6.1** `[D1+D2]` Cierre de despliegue y documentación ← MT1.5, MT2.2, MT2.3, MT3.1, MT4.1, MT4.2, MT5.1, MT0.3
  - [ ] US6.3 `[D1+D2]` (resto) README, `ADMIN-GUIDE.md`, `apphosting.yaml`, despliegue final
    - [ ] `[D1]` Despliegue App Hosting/Functions, configuración de secretos, verificación BFF
    - [ ] `[D2]` Actualización de documentación/UI referencias necesarias
  - [ ] AC6.2.2 `[D1]` Índices = combinaciones documentadas
- [ ] **MT6.2** `[D1+D2]` Hardening y QA final ← MT6.1 + todas las MUST/SHOULD (excluye MT5.2 y MT6.3)
  - [ ] Repaso de `[Debe NOT]`
    - [ ] `[D1]` Seguridad/BFF/Functions
    - [ ] `[D2]` UI/a11y/frontend
  - [ ] US7.2 `[D1+D2]` Presupuesto de rendimiento y de datos (gates bloqueantes)
    - [ ] `[D1]` Métricas backend/indización
    - [ ] `[D2]` Presupuesto de bundles/rutas cliente
  - [ ] US7.6 `[D1+D2]` (cierre) Lighthouse móvil y presupuesto de bundles fallan la build
    - [ ] `[D1]` Ajustes backend/cache
    - [ ] `[D2]` Ajustes UI/bundles
- [ ] **MT6.3** `[D1]` Autorización por roles múltiples `COULD` ← MT1.2
  - [ ] US1.12 `[D1]` Roles/permisos múltiples (extensión de MT1.2)