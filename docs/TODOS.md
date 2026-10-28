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
- [ ] **MT0.3** `[D1]` Infraestructura, cuentas y entornos (Firebase Blaze, R2, Resend, Translation, Scheduler, Secret Manager, DNS, alerta de presupuesto AC6.2.1) ← MT0.1
- [ ] **MT0.4** `[D1+D2]` Andamiaje técnico: contratos y base i18n ← MT0.2
  - [ ] US0.1 `[D1]` Contrato API (2 OpenAPI), `shared-types`, catálogo de errores y helper `buildWhatsAppUrl` (D35)
  - [ ] US0.4 `[D2]` Internacionalización por rutas `/es` y `/en`
  - [ ] US7.6 `[D1+D2]` (arranque) Playwright móvil/escritorio, `lighthouserc.json`, análisis de bundles (gates informativos)
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
- [ ] **MT1.2** `[D1+D2]` Autenticación end-to-end (incluye seed de `authorized_users`) ← MT1.1, MT0.3
  - [x] US1.1 `[D1]` Lista blanca verificada por el backend
  - [x] US1.2 `[D1]` `POST /api/auth/session` (BFF route handler)
  - [x] US1.3 `[D1]` Guard y propagación de identidad (`X-User-*`) (BFF)
  - [x] US1.4 `[D1]` `POST /api/auth/logout` (BFF route handler)
  - [ ] US1.5 `[D1+D2]` Front: ciclo de sesión, renovación, protección de `/admin`
    - [x] `[D1]` Endpoints BFF: `/api/auth/session`, `/api/auth/me`, `/api/auth/logout` + JWT `__session` + propagación `X-User-*`
    - [ ] `[D2]` UI/guard cliente: rutas `/admin/**`, layout/guard, Firebase Auth (`onAuthStateChanged`/`onIdTokenChanged`), renovación single-flight ante 401 y redirección al login (AC5.4.7)
  - [x] US1.6 `[D1]` `GET /api/auth/me` (BFF route handler)
- [ ] **MT1.3** `[D2]` Fundamentos de front compartidos ← MT0.4
  - [ ] US5.4 `[D2]` Cliente HTTP centralizado y `ApiError`
- [x] **MT1.4** `[D1]` Revalidación y traducción ← MT1.1, MT0.3
  - [x] US0.3 `[D1]` Revalidación bajo demanda
  - [x] US0.5 `[D1]` Traducción ES→EN selectiva por campo + edición manual
- [ ] **MT1.5** `[D1]` Operación base y despliegue temprano ← MT0.5, MT1.1, MT1.4
  - [ ] US6.1 `[D1]` (andamiaje) Datos de ejemplo reproducibles
  - [ ] US6.2 `[D1]` Costos y presupuesto bajo control
  - [ ] US6.3 `[D1]` (despliegue temprano)

---

## OLA 2 — Dominio backend y catálogo público

- [ ] **MT2.1** `[D1]` Dominio de inmuebles y media ← MT1.1, MT1.2, MT1.4, MT0.3
  - [ ] US1.7 `[D1]` Ciclo de vida del inmueble y código secuencial
  - [ ] US1.8 `[D1]` URLs presignadas de R2
  - [ ] US1.9 `[D1]` Confirmación de subida y derivados
- [ ] **MT2.2** `[D1]` Consulta pública y vigencia ← MT2.1, MT1.2, MT1.4, MT0.3
  - [ ] US1.10 `[D1]` Consulta pública (filtros, orden, cursor, índices)
  - [ ] US1.11 `[D1]` Bandera «Nuevo» (tarea programada)
  - [ ] US7.4 `[D1]` (backend) `PropertyCard`, compresión, caché
- [ ] **MT2.4** `[D1]` Seed de catálogo ← MT2.1, MT2.2
  - [ ] US6.1 `[D1]` (catálogo) Inmuebles, servicios y Nosotros; idempotente, traductor falso
- [ ] **MT2.3** `[D2]` Catálogo público (UI) ← MT2.2, MT2.4, MT1.3, MT0.4
  - [ ] US2.1 `[D2]` Pestañas independientes
  - [ ] US2.2 `[D2]` Buscador, skeletons y estados de carga
  - [ ] US2.3 `[D2]` Scroll infinito
  - [ ] US2.4 `[D2]` Ficha técnica con SEO y puntos de interés
  - [ ] US2.5 `[D2]` Botón de WhatsApp (usa `buildWhatsAppUrl`)
  - [ ] US2.6 `[D2]` Portada (Home)
  - [ ] US2.7 `[D2]` SEO técnico (parte inmuebles del sitemap)
  - [ ] US7.1 `[D2]` Interfaz Mobile First
  - [ ] US7.3 `[D2]` Imágenes y multimedia bajo demanda
  - [ ] US7.4 `[D2]` (cliente) API y caché eficientes
- [ ] **MT3.2** `[D2]` Páginas legales (adelantadas a Ola 2) ← MT0.4, MT1.4
  - [ ] US5.3 `[D2]` Aviso de privacidad, tratamiento de datos y términos

---

## OLA 3 — Consignación y correo

- [ ] **MT3.1** `[D1+D2]` Consignación end-to-end ← MT1.1, MT1.3, MT3.2, MT0.4, MT0.3
  - [ ] US3.1 `[D1+D2]` Formulario «Consigne su Propiedad»
    - [x] `[D1]` Endpoint BFF/Functions `POST /api/consignments` (integración Resend, validación, límite de envíos)
    - [ ] `[D2]` UI formulario `app/[locale]/consignar` (campos, consentimiento, manejo 429/422/500)
  - [ ] US3.2 `[D1]` Notificación por correo con Resend (BFF/Functions)
  - [ ] US3.3 `[D2]` Consentimiento de tratamiento de datos (UI)
  - [ ] US3.4 `[D1]` Protección contra bots y límite de envíos (BFF/Functions)

---

## OLA 4 — CMS y gestión

- [ ] **MT4.1** `[D1+D2]` CMS de inmuebles y media ← MT2.1, MT1.4, MT1.3, MT1.2, MT2.3
  - [ ] US4.1 `[D1+D2]` CRUD de inmuebles
    - [ ] `[D1]` BFF/Functions CRUD (`/api/properties`, dominio, validación, transiciones)
    - [ ] `[D2]` UI panel `/admin/inmuebles` (listado, formulario, guardar)
  - [ ] US4.2 `[D1+D2]` Uploader de fotos con reordenamiento y portada
    - [ ] `[D1]` Presigned URL + confirmación R2 (`/api/media/presign`, `/api/media/confirm`)
    - [ ] `[D2]` Uploader UI (drag&drop, reordenamiento, portada)
  - [ ] US4.3 `[D1+D2]` Videos y panorámicas 360°
    - [ ] `[D1]` Endpoints/media BFF/Functions
    - [ ] `[D2]` UI panel añadir videos/panorámicas 360°
  - [ ] US7.4 `[D2]` (panel) TanStack Query, debounce, timeouts
  - [ ] US7.5 `[D2]` Panel y subidas con datos móviles
- [ ] **MT4.2** `[D1+D2]` CMS de contenido ← MT1.4, MT1.3, MT1.2, MT4.1
  - [ ] US4.4 `[D1+D2]` Gestión de Servicios
    - [ ] `[D1]` CRUD BFF/Functions Servicios
    - [ ] `[D2]` UI panel `/admin/servicios`
  - [ ] US4.5 `[D1+D2]` Gestión de la página «Nosotros»
    - [ ] `[D1]` CRUD BFF/Functions Nosotros
    - [ ] `[D2]` UI panel `/admin/nosotros`
  - [ ] US7.1 `[D2]` (panel) Mobile First
  - [ ] US7.5 `[D2]` (listas y borradores)

---

## OLA 5 — Contenido público y contacto

- [ ] **MT5.1** `[D1+D2]` Páginas públicas de contenido ← MT2.2, MT2.4, MT2.3, MT0.4
  - [ ] US5.1 `[D2]` Índice y páginas de Servicios (UI)
  - [ ] US5.2 `[D2]` Pie de página y Contacto (UI)
  - [ ] US5.6 `[D2]` Página «Nosotros» (UI)
  - [ ] US7.1 `[D2]` (contacto) Mobile First
  - [ ] US2.7 `[D1]` (cierre) Sitemap completo (Servicios, Nosotros y legales) (BFF/Functions)
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