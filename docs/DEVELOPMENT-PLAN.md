# docs/DEVELOPMENT-PLAN.md
# Plan General de Desarrollo (Macro Tareas, Dependencias y Olas)

**Proyecto:** Plataforma Web & CMS `jfpropiedadraiz.com`  
**Versión:** 1.1 · 20 de octubre de 2026 (auditoría de prelaciones: aristas directas completas, sin ciclos; MT3.2 legales adelantada; endpoints públicos de contenido en MT2.2)  
**Base:** `./TASKS.md` (decisiones D1–D29), `./PERFORMANCE.md` (presupuestos) y `./AUTHENTICATION.md`  
**Arquitectura:** Monorepo (`packages/shared-types`, `packages/functions`, `packages/client`) · Next.js (BFF) + Firebase (Functions/Firestore/Auth/App Hosting) + Cloudflare R2 + Resend  
**Alcance:** orden de ejecución, prelación y dependencias. **No incluye estimaciones.** No sustituye al detalle de historias: la fuente de alcance y aceptación sigue siendo `./TASKS.md`.

---

## CÓMO LEER ESTE PLAN

- **FASE 0 — Habilitadores:** todo lo que debe existir **antes de escribir código de producto** (planificación, decisiones, repositorio, infraestructura, cuentas, entornos y andamiaje técnico). No es un entregable visible, pero habilita todo lo demás.
- **OLAS:** agrupaciones de trabajo **ordenadas por dependencia** (no por entregable). Una ola empieza cuando sus dependencias están resueltas. Dos olas pueden solaparse si no hay dependencia entre ellas.
- **MT (Macro Tarea):** agrupación mayor de historias (`US`) con un objetivo único. Es la unidad de planificación y de asignación; puede contener varias historias.
- **Depende de:** si aparece, la MT no debe iniciarse hasta que esas dependencias estén cerradas.
- Las historias `[Debe NOT]` y los criterios de aceptación viven en `./TASKS.md`; aquí no se repiten.

**Prioridad de las historias:** `MUST` bloquea el lanzamiento · `SHOULD` se espera en la v1 · `COULD` diferible. Las MT que contienen `COULD` (US1.12, US5.5) son diferibles y se marcan como tal.

- **Épica 7 («Mobile First y Uso Eficiente de Datos») es transversal y no tiene ola propia.** Sus exigencias se inyectan como AC en las MT que construyen cada superficie: MT2.2 (API y caché, US7.4), MT2.3 (UI pública, US7.1/US7.3), MT4.1 y MT4.2 (panel y subidas, US7.5) y MT5.1 (US7.1 en contacto). La **configuración temprana** (Playwright con móvil por defecto, `lighthouserc.json`, script de análisis de bundles) entra en **MT0.4**; los **gates numéricos** (US7.2 presupuesto + US7.6 CI) cierran en **MT6.2**. Detalle de AC en `./TASKS.md` (Épica 7) y valores en `./PERFORMANCE.md`.

---

## FASE 0 — HABILITADORES (antes de codificar)

### MT0.1 — Planificación, proceso y decisiones
- **Objetivo:** dejar cerradas las reglas del proyecto y las decisiones que bloquean el arranque.
- **Contenido:**
  - Definition of Done (DoD), estrategia de ramas, convención de commits y revisión de PR — ver `./DEFINITION-OF-DONE.md` (define los 4 niveles: DoR, US, MT y ola/release; ramas `main`/`dev` protegidas; cobertura backend ≥ 80 %). Incluye el bloque **«Mobile First & Rendimiento»** del DoD de historia (§2.10) y las filas de gate de rendimiento (US7.2/US7.6) en §6.
  - **Proceso de QA** frontend y backend (unit / integración / E2E, cobertura y gates) — **a crear** en `./QA.md`.
  - **Diagramas de secuencia de los flujos de autenticación** (Mermaid/SVG) — **a crear** en `./AUTH-FLOWS.md`.
- **Depende de:** —
- **Salida:** decisiones cerradas; QA y diagramas disponibles como referencia (documentos a crear dentro de esta MT).

### MT0.2 — Repositorio y tooling
- **Objetivo:** monorepo compilable, con estilo y CI mínima.
- **Contenido:** scaffold del monorepo (`packages/shared-types`, `packages/functions`, `packages/client`) + workspaces + `tsconfig`; lint/format (ESLint + Prettier, tipos estrictos); CI mínimo (build + lint + test) como gate.
- **Depende de:** —
- **Salida:** `npm install` + `build` + `lint` + `test` en verde desde un clon limpio.

### MT0.3 — Infraestructura, cuentas y entornos
- **Objetivo:** toda la plataforma externa contratada y conectable.
- **Contenido:** proyecto **Firebase** + plan **Blaze** (requerido por Functions/App Hosting) + habilitar Auth/Firestore/Functions/App Hosting; **sin** activar Identity Platform; **emuladores** (Auth/Firestore/Functions) para dev y test; cuentas externas (**Cloudflare R2** bucket + credenciales, **Resend** API key + dominio verificado, **Google Cloud Translation**, **Cloud Scheduler**); **Secret Manager** para los secretos y entornos (dev/staging/prod) + `.env` + `apphosting.yaml`; **dominio/DNS** público y de correo.
- **Depende de:** MT0.1.
- **Salida:** entornos operativos y credenciales inyectables; proyecto Firebase accesible por emuladores y por App Hosting.

### MT0.4 — Andamiaje técnico (contratos y base i18n)
- **Objetivo:** el contrato y el esqueleto sobre los que se construye todo.
- **Contenido:** **US0.1** (2 specs OpenAPI —`./openapi.backend.yaml` (interno BFF↔Functions) y `./openapi.bff.yaml` (público navegador↔BFF), D26— + `shared-types` + catálogo de códigos de error), **US0.4** (esqueleto de i18n por rutas `/es` y `/en`) y la **configuración de calidad mobile-first (US7.6, parte de arranque):** proyecto Playwright táctil por defecto (375 × 667, US7.6.1) más proyecto de escritorio smoke (US7.6.2), `lighthouserc.json` con el perfil de `./PERFORMANCE.md` (US7.6.3) y script de análisis de bundles para el gate de AC7.2.8. *US0.4 va al inicio porque, según el propio doc, cambiar la estructura después reescribe todas las rutas; la base de pruebas móvil se monta aquí para no reescribir la suite después.*
- **Depende de:** MT0.2.
- **Salida:** tipos compartidos y contrato publicados; estructura de rutas bilingüe montada.

> **Hito 0 (salida de la Fase 0):** repo + tooling + CI + Firebase/emuladores + cuentas + secretos/entornos + contratos + i18n base. A partir de aquí arranca la Ola 1.

---

## OLAS DE TRABAJO

### OLA 1 — Núcleo: autenticación, BFF y operación base

| MT | Macro tarea | Historias | Depende de |
| :-- | :-- | :-- | :-- |
| **MT1.1** | **BFF y seguridad interna** — reverse proxy de Next.js que valida su sesión (cookie), propaga identidad (`X-User-*`) y adjunta `X-Internal-Key`; reenvía el `idToken` al backend solo en el canje (`POST /api/auth/session`) | US0.2 | MT0.3, MT0.4 |
| **MT1.2** | **Autenticación end-to-end** — login Google + endpoint interno que valida el `idToken` y la lista blanca `authorized_users` (Firestore) en el backend + cookie de sesión propia del BFF + autorización por `X-User-Role` + guard/renovación + logout + `/api/auth/me` | US1.1, US1.2, US1.3, US1.4, US1.5, US1.6 | MT1.1, MT0.3 (Firebase Auth, Firestore) |
| **MT1.3** | **Fundamentos de front compartidos** — cliente HTTP centralizado y gestión estándar de `ApiError` (lo consumen catálogo, consignación y CMS). Su AC5.4.7 (redirección al login ante 401) se **cierra contra US1.5**, por eso depende de MT1.2 | US5.4 | MT0.4, MT1.2 |
| **MT1.4** | **Revalidación y traducción** — revalidación bajo demanda tras escrituras y traducción ES→EN selectiva por campo (`autoTranslate`, activa por defecto, con edición manual del inglés) con puerto `Translator` | US0.3, US0.5 | MT1.1, MT0.3 |
| **MT1.5** | **Operación base** — datos de ejemplo reproducibles, costos/presupuesto y despliegue temprano. El seed usa el **traductor falso** de AC0.5.9 (US0.5), por eso depende de MT1.4 | US6.1, US6.2, US6.3 (despliegue base) | MT1.1, MT1.4, MT0.3 |

### OLA 2 — Dominio backend y catálogo público

| MT | Macro tarea | Historias | Depende de |
| :-- | :-- | :-- | :-- |
| **MT2.1** | **Dominio de inmuebles y media** — ciclo de vida del inmueble + código secuencial, URLs presignadas de R2 y confirmación/generación de derivados. Los endpoints de media validan `X-User-Role: admin` (AC1.8.1), por eso depende de MT1.2 | US1.7, US1.8, US1.9 | MT1.1, MT1.2, MT0.3 (R2) |
| **MT2.2** | **Consulta pública y vigencia** — filtros, orden por `createdAt` descendente, cursor e índices (tabla única en `./ARCHITECTURE.md`, AC1.10.4); tarea programada de la bandera «Nuevo» (que **dispara la revalidación** de US0.3, AC1.11.4, y exige MT1.4); y **endpoints públicos de lectura de contenido** (listado de servicios y documento Nosotros) que consume la portada/sitemap (US2.6, US2.7) y más tarde US5.1/US5.6 | US1.10, US1.11, US7.4 (parte backend: `PropertyCard`, compresión, caché) | MT2.1, MT1.2, MT1.4, MT0.3 (Scheduler) |
| **MT2.3** | **Catálogo público (UI)** — pestañas, buscador, scroll infinito, ficha técnica con SEO y puntos de interés, WhatsApp, portada y SEO técnico | US2.1, US2.2, US2.3, US2.4, US2.5, US2.6, US2.7, US7.1, US7.3, US7.4 (parte cliente) | MT2.2, MT1.3, MT0.4 |

### OLA 3 — Consignación y correo

| MT | Macro tarea | Historias | Depende de |
| :-- | :-- | :-- | :-- |
| **MT3.1** | **Consignación end-to-end** — formulario, consentimiento de datos, notificación con Resend y protección contra bots. Va por el BFF (US0.2) y usa el helper `buildWhatsAppUrl` (T3/US2.5) en el respaldo de AC3.1.5, por eso depende de MT1.1 y MT2.3. Su consentimiento enlaza a las páginas legales de **MT3.2** | US3.1, US3.2, US3.3, US3.4 | MT1.1, MT1.3, MT2.3, MT3.2, MT0.4, MT0.3 (Resend) |
| **MT3.2** | **Páginas legales (adelantadas)** — aviso de privacidad, política de tratamiento de datos y términos, adelantadas para que el consentimiento de MT3.1 y el footer/sitemap de MT2.3 apunten a rutas reales. Son texto estático (solo dependen de las rutas de MT0.4 y, para la traducción de cortesía en inglés, del servicio de US0.5 → MT1.4) | US5.3 | MT0.4, MT1.4 |

### OLA 4 — CMS y gestión

| MT | Macro tarea | Historias | Depende de |
| :-- | :-- | :-- | :-- |
| **MT4.1** | **CMS de inmuebles y media** — CRUD de inmuebles, uploader de fotos con reordenamiento/portada, videos y panorámicas 360°. Bajo el guard de sesión de `/admin` (DoD §2.6/US1.5, MT1.2) y reutiliza los componentes públicos de tarjeta/ficha en las vistas previas (AC4.1.9, MT2.3) | US4.1, US4.2, US4.3, US7.5 | MT2.1, MT1.4, MT1.3, MT1.2, MT2.3 |
| **MT4.2** | **CMS de contenido** — gestión de Servicios y de la página «Nosotros». Bajo el guard de sesión de `/admin` (MT1.2) y reutiliza el flujo de fotos de US4.2 (AC4.4.6), por eso depende de MT4.1 | US4.4, US4.5, US7.1 (panel), US7.5 (listas y borradores) | MT1.4, MT1.3, MT1.2, MT4.1 |

### OLA 5 — Contenido público, contacto y legales

| MT | Macro tarea | Historias | Depende de |
| :-- | :-- | :-- | :-- |
| **MT5.1** | **Páginas públicas de contenido** — índice/detalle de Servicios, pie de página y contacto, página «Nosotros». Usan el helper `buildWhatsAppUrl` (AC5.1.2/AC5.2.2) y el SEO técnico (AC5.6.4) de MT2.3, y leen los endpoints públicos de MT2.2 | US5.1, US5.2, US5.6, US7.1 (contacto) | MT4.2, MT4.1, MT2.3, MT2.2, MT0.4 |
| **MT5.2** | **Contacto editable (COULD)** — configuración de contacto desde el panel | US5.5 | MT4.2 |

### OLA 6 — Operación y cierre

| MT | Macro tarea | Historias | Depende de |
| :-- | :-- | :-- | :-- |
| **MT6.1** | **Cierre de despliegue y documentación** — índices, README, `ADMIN-GUIDE.md`, `apphosting.yaml` y despliegue final. Documenta el CMS (AC6.3.4: subir fotos, portada, inmuebles, servicios, Nosotros → MT4.1/MT4.2) y verifica que el BFF y la revalidación alcanzan la app (AC6.3.6 → MT1.1/MT1.4). **Aquí se cierra AC6.2.2** (índices = combinaciones documentadas), cuando los índices de US1.10/MT2.2 ya existen | US6.3 (resto) | MT1.5, MT2.2, MT4.1, MT4.2, MT0.3 |
| **MT6.2** | **Hardening y QA final** — repaso de `[Debe NOT]`, cobertura, accesibilidad y regresión; **gates de rendimiento móvil (US7.2/US7.6): Lighthouse móvil y presupuesto de bundles que fallan la build** | US7.2, US7.6 (transversal a todas) | Todas |
| **MT6.3** | **Autorización por roles (COULD, diferible)** — autorización por rol `admin` vía `X-User-Role` | US1.12 | MT1.2 |

---

## GRAFO DE DEPENDENCIAS (nivel MT)

Se dibujan **solo las aristas directas** (sin las redundantes por transitividad); la fuente exacta es la columna «Depende de» de cada tabla de ola.

```
FASE 0
  MT0.1 ──> MT0.3
  MT0.2 ──> MT0.4

OLA 1  (MT0.3 y MT0.4 son la base de casi todo)
  MT0.3 ──> MT1.1
  MT0.4 ──> MT1.1            MT1.1 ──> MT1.2 ──> MT6.3
                             MT1.1 ──> MT1.4
  MT0.4 ──> MT1.3            MT1.2 ──> MT1.3        (AC5.4.7 → US1.5)
                             MT1.1 ──> MT1.5
                             MT1.4 ──> MT1.5        (seed usa traductor falso)

OLA 2
  MT1.1 ──> MT2.1            MT1.2 ──> MT2.1        (media valida X-User-Role)
  MT2.1 ──> MT2.2            MT1.2 ──> MT2.2
                             MT1.4 ──> MT2.2        (tarea «Nuevo» → revalidación)
  MT2.2 ──> MT2.3            MT1.3 ──> MT2.3        MT0.4 ──> MT2.3

OLA 3
  MT1.1 ──> MT3.1            MT1.3 ──> MT3.1        MT2.3 ──> MT3.1   (helper WhatsApp)
                             MT3.2 ──> MT3.1        (consentimiento → legales)
  MT0.4 ──> MT3.2            MT1.4 ──> MT3.2        (traducción de cortesía)

OLA 4
  MT2.1 ──> MT4.1            MT1.4 ──> MT4.1        MT1.3 ──> MT4.1
                             MT1.2 ──> MT4.1        (guard /admin)
                             MT2.3 ──> MT4.1        (vistas previas reutilizan UI pública)
  MT1.4 ──> MT4.2            MT1.3 ──> MT4.2        MT1.2 ──> MT4.2
                             MT4.1 ──> MT4.2        (galería reutiliza US4.2)

OLA 5
  MT4.2 ──> MT5.1            MT4.1 ──> MT5.1        MT2.3 ──> MT5.1
                             MT2.2 ──> MT5.1        (lee endpoints públicos)
  MT4.2 ──> MT5.2

OLA 6
  MT1.5 ──> MT6.1            MT2.2 ──> MT6.1        MT4.1 ──> MT6.1   MT4.2 ──> MT6.1
  Todas ──> MT6.2            MT1.2 ──> MT6.3
```

**Resumen de aristas directas por MT (idéntico a las tablas):** MT0.3←MT0.1 · MT0.4←MT0.2 · MT1.1←{MT0.3,MT0.4} · MT1.2←{MT1.1,MT0.3} · MT1.3←{MT0.4,MT1.2} · MT1.4←{MT1.1,MT0.3} · MT1.5←{MT1.1,MT1.4,MT0.3} · MT2.1←{MT1.1,MT1.2,MT0.3} · MT2.2←{MT2.1,MT1.2,MT1.4,MT0.3} · MT2.3←{MT2.2,MT1.3,MT0.4} · MT3.1←{MT1.1,MT1.3,MT2.3,MT3.2,MT0.4,MT0.3} · MT3.2←{MT0.4,MT1.4} · MT4.1←{MT2.1,MT1.4,MT1.3,MT1.2,MT2.3} · MT4.2←{MT1.4,MT1.3,MT1.2,MT4.1} · MT5.1←{MT4.2,MT4.1,MT2.3,MT2.2,MT0.4} · MT5.2←{MT4.2} · MT6.1←{MT1.5,MT2.2,MT4.1,MT4.2,MT0.3} · MT6.2←Todas · MT6.3←{MT1.2}.

> Aristas **omitidas por transitividad** (no se repiten en cada MT destino para no duplicar; ya se alcanzan por otra ruta declarada): `MT0.3→MT1.2` (por MT1.1), `MT0.3→MT1.4` (por MT1.1), `MT0.3→MT2.1`/`MT0.3→MT2.2` (por MT1.1), `MT0.3→MT3.1` (por MT1.1), `MT0.4→MT5.1` (por MT2.3), `MT1.1→MT4.1` (por MT2.1), `MT1.4→MT6.1` (por MT2.2), `MT1.2→MT5.1` (por MT4.1/MT4.2), `MT2.1→MT4.2` (por MT4.1), `MT2.2→MT5.2` (por MT4.2). Las que **sí** aparecen como directas aunque exista una ruta más larga se declaran porque el AC que las exige nombra el artefacto concreto (p. ej. `MT1.2→MT2.1` por `X-User-Role`, `MT2.2→MT6.1` por el cierre de AC6.2.2).
>
> **Sin ciclos:** todas las aristas respetan el orden de olas (0 → 1 → 2 → 3 → 4 → 5 → 6; las intra-ola `MT1.2→MT1.3`, `MT1.4→MT1.5`, `MT4.1→MT4.2` siguen siendo acíclicas).

**Cadena crítica (resumida):** `MT0.2 → MT0.4 → MT1.1 → MT2.1 → MT2.2 → MT2.3` (backend y catálogo público). La autenticación (`MT1.2`) es habilitadora temprana: **precede a todas las MT que exponen rutas de administrador** (`MT2.1`, `MT4.1`, `MT4.2`) aunque su UI (`US1.5`) corra en paralelo.

---

## BLOQUEOS Y DEPENDENCIAS QUE AFECTAN EL ORDEN

Esta tabla recoge toda prelación **no evidente** (las obvias están en las columnas «Depende de»). Sirve para justificar el orden y para no arrancar una MT antes de tiempo.

| Prelación | Naturaleza | Por qué (fuente) | Efecto en el plan |
| :-- | :-- | :-- | :-- |
| **MT1.2 (auth) → MT2.1, MT4.1, MT4.2** | Técnica | AC1.8.1 (media valida `X-User-Role`) y DoD §2.6 (guard de `/admin`) | La auth va en Ola 1, antes de cualquier ruta admin. |
| **MT1.4 (revalidación) → MT2.2, MT6.1** | Técnica | AC1.11.4 (tarea «Nuevo» revalida) y AC6.3.6 (la revalidación alcanza la app) | US0.3/MT1.4 antecede a la vigencia y al cierre. |
| **MT1.4 (traductor) → MT1.5 (seed)** | Técnica | AC6.1.4 (el seed usa el traductor falso de AC0.5.9) | Misma ola; el seed no llama al proveedor real. |
| **MT2.2 (endpoints públicos de servicios/Nosotros) → MT2.3 (US2.6/US2.7)** | Técnica | AC2.6.2/AC2.6.4 (portada) y AC2.7.3 (sitemap) necesitan datos de contenido | **Rompe el cluster**: la portada y el sitemap cierran en Ola 2 sin esperar al CMS. |
| **MT2.3 (US2.5 helper, US2.7 SEO) → MT3.1, MT5.1** | Contrato (T3) | AC3.1.5 / AC5.1.2 / AC5.2.2 usan `buildWhatsAppUrl`; AC5.6.4 usa el SEO de US2.7 | El helper y el SEO se entregan en Ola 2. |
| **MT3.2 (legales) → MT3.1** | Contrato | AC3.3.1 (el consentimiento enlaza a la Política de Tratamiento) | Las legales se **adelantan** a Ola 3 para que el enlace no dé 404. |
| **MT3.2 (legales) → MT2.7 sitemap** | Contrato | AC2.7.3 (el sitemap lista las rutas legales) | Las legales resuelven antes de que el sitemap cierre la Ola 2→… (el sitemap se completa al revalidar). |
| **MT2.3 (vistas previas) → MT4.1** | UI | AC4.1.9 (el editor reutiliza los componentes de tarjeta/ficha públicos) | No reimplementar componentes de catálogo en el CMS. |
| **MT4.1 (US4.2 uploader) → MT4.2** | UI | AC4.4.6 (la galería de servicios reutiliza el flujo de fotos) | Dentro de Ola 4: primero inmuebles, luego contenido. |
| **MT4.1, MT4.2 → MT6.1** | Documental | AC6.3.4 (`ADMIN-GUIDE` documenta el CMS: fotos, portada, servicios, Nosotros) | El cierre documenta funcionalidad ya existente. |
| **AC6.2.2 (índices) verificado en MT6.1** | Técnica | El estado «índices = combinaciones documentadas» solo es cierto tras US1.10 (MT2.2) | US6.2 cierra su faceta de índices en MT6.1, no en Ola 1. |
| **Contenido legal real (cliente)** | Externa | AC5.3.4 (revisión jurídica antes de producción) | Dependencia externa; no bloquea el desarrollo, sí el release. |

---

## ASIGNACIÓN SUGERIDA (2 devs)

| Dev | Foco | Macro tareas |
| :-- | :-- | :-- |
| **Dev 1** (backend) | **BFF (servidor)**, auth, dominio de inmuebles, media, correo, revalidación/traducción | MT1.1, MT1.2, MT1.4, MT2.1, MT2.2, MT3.1 |
| **Dev 2** (frontend) | UI: ciclo de sesión, catálogo, CMS, páginas públicas y legales | MT1.3 (front), MT2.3, MT3.2, MT4.1, MT4.2, MT5.1, MT5.2 |
| **Compartidas (Fullstack)** | Fundaciones, operación, cierre y `shared-types` | MT0.2, MT0.3, MT0.4, MT1.5, MT6.1, MT6.2 |

### Propiedad de código (frontera BFF)

El **BFF es código de servidor de Next.js** y se asigna a **Dev 1** aunque viva físicamente en `packages/client`. La separación es **por carpeta, no por paquete**:

| Ruta | Responsable | Contenido |
| :-- | :-- | :-- |
| `packages/client/src/app/api/**` | **Dev 1** | Route handlers del BFF: `/api/auth/session`, `/api/auth/logout`, `/api/auth/me`, `/api/bff/*`, `/api/revalidate` |
| `packages/client/src/server/**` | **Dev 1** | `session/jwt.ts` (el BFF ya no usa Firebase Admin; la verificación del idToken vive en `packages/functions/**`) |
| `packages/client/middleware.ts` | **Dev 1** | Guard de sesión y propagación `X-User-*` (US1.3) |
| `packages/client/**` (resto) | **Dev 2** | Componentes React, TanStack Query, SDK cliente de Firebase |
| `packages/functions/**` | **Dev 1** | Backend (Clean Architecture) |
| `packages/shared-types/**` | **Fullstack** | Contratos y tipos (US0.1) |

**Reasignación reflejada en `./TASKS.md`:** US0.2, US1.2, US1.3 y US1.6 → **Dev 1**; US1.4 y US5.4 → **Fullstack**; US1.5 permanece en **Dev 2** (SDK de cliente y UI). US5.3 (legales, MT3.2) se asigna a **Dev 2** (contenido estático + rutas i18n).

Reglas:
- El código de `src/server/**` es **server-only**; prohibido importarlo desde componentes cliente (paquete `server-only` + regla de lint).
- La frontera entre ambos es el **contrato** de `shared-types` (US0.1).
- El **middleware (US1.3)** afecta al enrutado: requiere coordinación entre devs y se define temprano (Ola 1).

---

## TRAZABILIDAD (US → MT → OLA)

| US | Contenido | MT | Ola |
| :-- | :-- | :-- | :-- |
| US0.1 | Contrato API, respuesta estándar y códigos de error | MT0.4 | Fase 0 |
| US0.2 | BFF de Next.js y seguridad interna | MT1.1 | 1 |
| US0.3 | Revalidación bajo demanda | MT1.4 | 1 |
| US0.4 | Internacionalización por rutas | MT0.4 | Fase 0 |
| US0.5 | Traducción ES→EN selectiva por campo + edición manual del EN | MT1.4 | 1 |
| US1.1 | Control de acceso por lista blanca (verificada por el backend) | MT1.2 | 1 |
| US1.2 | BFF: `POST /api/auth/session` | MT1.2 | 1 |
| US1.3 | BFF: guard + propagación de identidad | MT1.2 | 1 |
| US1.4 | BFF: `POST /api/auth/logout` | MT1.2 | 1 |
| US1.5 | Front: ciclo de sesión, renovación y protección de `/admin` | MT1.2 | 1 |
| US1.6 | BFF: `GET /api/auth/me` | MT1.2 | 1 |
| US1.7 | Ciclo de vida del inmueble y código secuencial | MT2.1 | 2 |
| US1.8 | Firmado de URLs presignadas para R2 | MT2.1 | 2 |
| US1.9 | Confirmación de subida y generación de derivados | MT2.1 | 2 |
| US1.10 | Consulta pública del catálogo (filtros, orden, cursor, índices) | MT2.2 | 2 |
| US1.11 | Vigencia de la bandera «Nuevo» (tarea programada) | MT2.2 | 2 |
| US1.12 | Autorización por roles (**COULD**) | MT6.3 | 6 |
| US2.1 | Navegación por pestañas independientes | MT2.3 | 2 |
| US2.2 | Buscador con filtros, skeletons y estados de carga | MT2.3 | 2 |
| US2.3 | Scroll infinito del listado | MT2.3 | 2 |
| US2.4 | Ficha técnica con SEO y puntos de interés | MT2.3 | 2 |
| US2.5 | Botón de WhatsApp y helper de enlaces | MT2.3 | 2 |
| US2.6 | Portada (Home) | MT2.3 (lee endpoints públicos de MT2.2) | 2 |
| US2.7 | SEO técnico (ambos idiomas) | MT2.3 (sitemap cubre legales de MT3.2) | 2 |
| US3.1 | Formulario «Consigne su Propiedad» | MT3.1 | 3 |
| US3.2 | Notificación por correo con Resend | MT3.1 | 3 |
| US3.3 | Consentimiento de tratamiento de datos | MT3.1 | 3 |
| US3.4 | Protección contra bots y límite de envíos | MT3.1 | 3 |
| US4.1 | CRUD de inmuebles en el panel | MT4.1 | 4 |
| US4.2 | Uploader de fotos con reordenamiento y portada | MT4.1 | 4 |
| US4.3 | Videos y panorámicas 360° | MT4.1 | 4 |
| US4.4 | Gestión de Servicios | MT4.2 | 4 |
| US4.5 | Gestión de la página «Nosotros» | MT4.2 | 4 |
| US5.1 | Índice y páginas de Servicios | MT5.1 | 5 |
| US5.2 | Pie de página y página de Contacto | MT5.1 | 5 |
| US5.3 | Páginas legales | MT3.2 (adelantada) | 3 |
| US5.4 | Cliente HTTP centralizado y `ApiError` | MT1.3 | 1 |
| US5.5 | Configuración de contacto editable (**COULD**) | MT5.2 | 5 |
| US5.6 | Página «Nosotros» | MT5.1 | 5 |
| US6.1 | Datos de ejemplo reproducibles | MT1.5 | 1 |
| US6.2 | Costos y presupuesto bajo control | MT1.5 | 1 |
| US6.3 | Despliegue y documentación | MT1.5 / MT6.1 | 1 / 6 |
| US7.1 | Interfaz Mobile First | MT2.3, MT4.2, MT5.1 | 2 / 4 / 5 |
| US7.2 | Presupuesto de rendimiento y de datos | MT6.2 | 6 |
| US7.3 | Imágenes y multimedia bajo demanda | MT2.3 | 2 |
| US7.4 | API y caché eficientes para datos móviles | MT2.2 / MT2.3 | 2 |
| US7.5 | Panel de administración y subidas con datos móviles | MT4.1 / MT4.2 | 4 |
| US7.6 | Calidad mobile first en pruebas y CI | MT0.4 / MT6.2 | Fase 0 / 6 |

---

## REGLAS DE SECUENCIACIÓN (resumen)

1. **Nada de producto antes de la Fase 0.** En particular, `MT0.2` (repo/tooling), `MT0.3` (infra) y `MT0.4` (contratos + i18n) son prerequisito.
2. **`US0.1` es la raíz:** tipos y contrato antes de cualquier implementación.
3. **`US0.4` (i18n) al inicio:** la estructura de rutas se construye una sola vez.
4. **`US5.4` adelantado:** es infraestructura de front compartida por catálogo, consignación y CMS (pero cierra su redirección 401 contra `US1.5`, por eso depende de `MT1.2`).
5. **`MT1.2` (auth) antes de toda ruta de administrador:** `MT2.1` (media valida rol), `MT4.1` y `MT4.2` (guard de `/admin`).
6. **El dominio backend (`MT2.1`/`MT2.2`) es prerequisito del catálogo (`MT2.3`) y del CMS (`MT4.1`).**
7. **`US0.3` y `US0.5` antes de las escrituras del CMS (`MT4.x`)** y antes de la vigencia «Nuevo» (`MT2.2`) y del seed (`MT1.5`).
8. **Contenido público de lectura temprano:** los endpoints públicos de servicios y Nosotros se entregan en `MT2.2`, de modo que la portada y el sitemap (`MT2.3`) cierran sin esperar al CMS (`MT4.2`/`MT5.1`).
9. **Legales adelantadas (`MT3.2`):** las páginas legales solo dependen de `MT0.4` (+ `US0.5` para el inglés) y se entregan antes de `MT3.1`, para que el consentimiento (`AC3.3.1`) y el sitemap (`AC2.7.3`) apunten a rutas reales.
10. **El helper de WhatsApp (`US2.5`, `MT2.3`) precede a todo enlace del sitio** (`MT3.1`, `MT5.1`), regla T3.
