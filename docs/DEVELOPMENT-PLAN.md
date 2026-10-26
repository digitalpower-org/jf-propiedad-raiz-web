# docs/DEVELOPMENT-PLAN.md
# Plan General de Desarrollo (Macro Tareas, Dependencias y Olas)

**Proyecto:** Plataforma Web & CMS `jfpropiedadraiz.com`  
**Versión:** 1.5 · 22 de octubre de 2026 (major de Next.js declarada como requisito de diseño; base de decisiones actualizada a D1–D36)  
**Base:** `./TASKS.md` (decisiones D1–D36), `./PERFORMANCE.md` (presupuestos) y `./AUTHENTICATION.md`  
**Arquitectura:** Monorepo (`packages/shared-types`, `packages/functions`, `packages/client`) · Next.js (BFF) + Firebase (Functions/Firestore/Auth/App Hosting) + Cloudflare R2 + Resend  
**Requisito de diseño (Next.js):** la **major de Next.js 16** no es una preferencia, es una condición de la arquitectura del BFF — en Next 16 la convención `middleware` se renombró a `proxy`, y por eso el **cierre de superficie** (404/405) vive en `packages/client/src/proxy.ts` (con `src/`, el archivo debe llamarse `proxy.ts`; con `middleware` Next lo ignora silenciosamente). La major queda **bloqueada**: subir el patch (16.3.8 → 16.x) es routine, pero saltar de major exige revisar el Proxy, sus 404/405 y sus tests (AC0.1.6). La sesión se valida en el route handler (D32). Versiones fijadas de todo el stack: `./ARCHITECTURE.md` §2.1.  
**Alcance:** orden de ejecución, prelación y dependencias. **No incluye estimaciones.** No sustituye al detalle de historias: la fuente de alcance y aceptación sigue siendo `./TASKS.md`.

---

## CÓMO LEER ESTE PLAN

- **FASE 0 — Habilitadores:** todo lo que debe existir **antes de escribir código de producto** (planificación, decisiones, repositorio, infraestructura, cuentas, entornos y andamiaje técnico). No es un entregable visible, pero habilita todo lo demás.
- **OLAS:** agrupaciones de trabajo **ordenadas por dependencia** (no por entregable). Una ola empieza cuando sus dependencias están resueltas. Dos olas pueden solaparse si no hay dependencia entre ellas.
- **MT (Macro Tarea):** agrupación mayor de historias (`US`) con un objetivo único. Es la unidad de planificación y de asignación; puede contener varias historias.
- **Depende de:** si aparece, la MT no debe iniciarse hasta que esas dependencias estén cerradas.
- Las historias `[Debe NOT]` y los criterios de aceptación viven en `./TASKS.md`; aquí no se repiten.

**Prioridad de las historias:** `MUST` bloquea el lanzamiento · `SHOULD` se espera en la v1 · `COULD` diferible. Las MT que contienen `COULD` (US1.12, US5.5) son diferibles y se marcan como tal.

- **Épica 7 («Mobile First y Uso Eficiente de Datos») es transversal y no tiene ola propia.** Sus exigencias se inyectan como AC en las MT que construyen cada superficie: MT2.2 (API y caché, US7.4), MT2.3 (UI pública, US7.1/US7.3), MT4.1 y MT4.2 (panel y subidas, US7.5) y MT5.1 (US7.1 en contacto). La **configuración temprana** (Playwright con móvil por defecto, `lighthouserc.json`, script de análisis de bundles) entra en **MT0.4**, donde los gates quedan **informativos**; siguen así hasta **MT6.2**, cuando pasan a **bloqueantes** para todas las rutas de AC7.2.1 (US7.2 presupuesto + US7.6 CI). La cobertura de `lighthouserc.json` es **incremental**: MT0.4 mide `/es` y `/en`; MT2.3 añade listados y ficha; MT3.2, legales; MT3.1, consignación; MT5.1, servicios, Nosotros y contacto; el set completo se cierra **antes** de activar el gate de MT6.2. Las mediciones por superficie de MT2.3 son referencia, no gate. Detalle de AC en `./TASKS.md` (Épica 7) y valores en `./PERFORMANCE.md`.

---

## FASE 0 — HABILITADORES (antes de codificar)

### MT0.1 — Planificación, proceso y decisiones
- **Objetivo:** dejar cerradas las reglas del proyecto y las decisiones que bloquean el arranque.
- **Contenido:**
  - Definition of Done (DoD), estrategia de ramas, convención de commits y revisión de PR — ver `./DEFINITION-OF-DONE.md` (define los 4 niveles: DoR, US, MT y ola/release; ramas `main`/`dev` protegidas; cobertura backend ≥ 80 %). Incluye el bloque **«Mobile First & Rendimiento»** del DoD de historia (§2.10) y las filas de gate de rendimiento (US7.2/US7.6) en §6.
  - **Proceso de QA** frontend y backend (unit / integración / E2E, cobertura y gates) — ver `./QA.md` (ya existe; fuente operativa).
  - **Diagramas de secuencia de los flujos de autenticación** (Mermaid/SVG) — **cubiertos por** `./AUTHENTICATION.md` §§7–9 (no se crea `./AUTH-FLOWS.md`).
- **Depende de:** —
- **Salida:** decisiones cerradas; QA y flujos de autenticación disponibles como referencia en `./QA.md` y `./AUTHENTICATION.md`.

### MT0.2 — Repositorio y tooling
- **Objetivo:** monorepo compilable, con estilo y CI mínima.
- **Contenido:** scaffold del monorepo (`packages/shared-types`, `packages/functions`, `packages/client`) + workspaces + `tsconfig`; lint/format (ESLint + Prettier, tipos estrictos); CI con los 7 gates de `./QA.md` §5.1 en su orden (`.github/workflows/ci.yml`, un único job) como gate.
- **Depende de:** MT0.1 (las ramas, la convención de commits y el DoD se definen en MT0.1 y este repo las aplica).
- **Salida:** `npm install` + `build` + `lint` + `test` en verde desde un clon limpio, y la CI (`.github/workflows/ci.yml`) los reproduce con `npm ci`.

### MT0.3 — Infraestructura, cuentas y entornos
- **Objetivo:** toda la plataforma externa contratada y conectable.
- **Contenido:** proyecto **Firebase** + plan **Blaze** (requerido por Functions/App Hosting) + habilitar Auth/Firestore/Functions/App Hosting; **sin** activar Identity Platform; **emuladores** (Auth/Firestore/Functions) para dev y test; cuentas externas (**Cloudflare R2** bucket + credenciales, **Resend** API key + dominio verificado, **Google Cloud Translation**); **Secret Manager** para los secretos y entornos (dev/staging/prod) + `.env` + `apphosting.yaml`; **dominio/DNS** público y de correo. Incluye la **alerta de presupuesto (US6.2, AC6.2.1)** que exige el plan Blaze: debe crearse aquí, al activar Blaze, no en una ola posterior.
- **Depende de:** MT0.1.
- **Salida:** entornos operativos y credenciales inyectables; alerta de presupuesto activa; proyecto Firebase accesible por emuladores y por App Hosting.

### MT0.4 — Andamiaje técnico (contratos y base i18n)
- **Objetivo:** el contrato y el esqueleto sobre los que se construye todo.
- **Contenido:** **US0.1** (2 specs OpenAPI —`./openapi.backend.yaml` (interno BFF↔Functions) y `./openapi.bff.yaml` (público navegador↔BFF), D26— + `shared-types` + catálogo de códigos de error, **más el helper puro `buildWhatsAppUrl` de US2.5 en `packages/client/src/lib/whatsapp.ts` (D35)** para que consignación y contenido no dependan del catálogo), **US0.4** (esqueleto de i18n por rutas `/es` y `/en`) y la **configuración de calidad mobile-first (US7.6, parte de arranque):** proyecto Playwright táctil por defecto (375 × 667, US7.6.1) más proyecto de escritorio smoke (US7.6.2), `lighthouserc.json` con el perfil de `./PERFORMANCE.md` (US7.6.3) y script de análisis de bundles para el gate de AC7.2.8. Los **gates de rendimiento quedan informativos (no bloquean) desde aquí** y siguen así hasta **MT6.2**, cuando pasan a bloqueantes para todas las rutas de AC7.2.1 (US7.2/US7.6). La cobertura de `lighthouserc.json` es incremental: empieza con `/es` y `/en` y cada MT añade sus rutas (MT2.3, MT3.2, MT3.1, MT5.1) hasta cerrar el set completo antes del gate de MT6.2; las mediciones por superficie de MT2.3 son referencia, no gate. *US0.4 va al inicio porque, según el propio doc, cambiar la estructura después reescribe todas las rutas; la base de pruebas móvil se monta aquí para no reescribir la suite después.*
- **Depende de:** MT0.2.
- **Salida:** tipos compartidos y contrato publicados; helper `buildWhatsAppUrl` en `packages/client/src/lib/whatsapp.ts` (D35); estructura de rutas bilingüe montada; gates de rendimiento listos en modo informativo.

### MT0.5 — Esqueleto desplegable («walking skeleton»)
- **Objetivo:** probar el despliegue de punta a punta en la Fase 0, antes de que el producto dependa de él.
- **Contenido:** un despliegue mínimo funcionando de **App Hosting (BFF/Next) + Functions + Firestore** con los `shared-types` ya consumidos por `functions` vía `tsconfig paths`, para detectar de inmediato el riesgo de que el paquete de tipos no resuelva en el deploy de Functions. Sin lógica de producto: una ruta de health y una función trivial bastan.
- **Depende de:** MT0.3, MT0.4.
- **Salida:** despliegue de prueba en verde que fija el patrón de build/empaquetado que reutiliza MT1.5 y el cierre (MT6.1).

> **Hito 0 (salida de la Fase 0):** repo + tooling + CI + Firebase/emuladores + cuentas + secretos/entornos + alerta de presupuesto + contratos y helper `buildWhatsAppUrl` (D35) + i18n base + **esqueleto desplegado (MT0.5)**. A partir de aquí arranca la Ola 1.

---

## OLAS DE TRABAJO

### OLA 1 — Núcleo: autenticación, BFF y operación base

| MT | Macro tarea | Historias | Depende de |
| :-- | :-- | :-- | :-- |
| **MT1.1** | **BFF y seguridad interna** — superficie pública explícita del BFF (`app/api/**`, un route handler por ruta, sin *catch-all*, D31) sobre el catálogo `src/server/routes.ts` **generado** desde `./openapi.bff.yaml` (mapeo a la ruta interna y política de sesión, AC0.1.8), más el guard de Next (`src/proxy.ts`, convención **Proxy** de Next 16), que **solo** cierra la superficie (404/405, D32) y **no** autentica: la cookie la valida el envoltorio de cada route handler, que además propaga la identidad (`X-User-*`) y adjunta `X-Internal-Key` (D32, D34). (El canje del idToken —`POST /api/auth/session`— es US1.2 y vive en MT1.2.) | US0.2 | MT0.3, MT0.4, MT0.5 |
| **MT1.2** | **Autenticación end-to-end** — login Google + endpoint interno que valida el `idToken` y la lista blanca `authorized_users` (Firestore) en el backend + cookie de sesión propia del BFF + autorización por `X-User-Role` + guard/renovación + logout + `/api/auth/me`. **Incluye el seed de `authorized_users`** (necesario para que US1.1 sea verificable) | US1.1, US1.2, US1.3, US1.4, US1.5, US1.6 | MT1.1, MT0.3 (Firebase Auth, Firestore) |
| **MT1.3** | **Fundamentos de front compartidos** — cliente HTTP centralizado y gestión estándar de `ApiError` (lo consumen catálogo, consignación y CMS). La redirección al login ante 401 (AC5.4.7) se **re-scopa a US1.5** (vive con el ciclo de sesión), de modo que MT1.3 no depende de MT1.2 y se elimina el ciclo latente MT1.2↔MT1.3 | US5.4 | MT0.4 |
| **MT1.4** | **Revalidación y traducción** — revalidación bajo demanda tras escrituras y traducción ES→EN selectiva por campo (`autoTranslate`, activa por defecto, con edición manual del inglés) con puerto `Translator`. Es prerequisito de **toda** escritura que traduce/revalida, incluido el alta de inmuebles (US1.7) | US0.3, US0.5 | MT1.1, MT0.3 |
| **MT1.5** | **Operación base y despliegue temprano** — datos de ejemplo reproducibles, costos/presupuesto y despliegue. El **seed de catálogo** (inmuebles, servicios y Nosotros; AC6.1.2) **no vive aquí**: depende del dominio y se ubica tras MT2.2 (ver MT2.4). Lo que sí se entrega aquí es el **despliegue temprano** (reutiliza el esqueleto de MT0.5) y el andamiaje del seed. *(Nota: el seed usa el traductor falso de AC0.5.9 —US0.5/MT1.4— y no llama al proveedor real.)* | US6.1 (andamiaje), US6.2, US6.3 (despliegue temprano) | MT0.5, MT1.1, MT1.4 |

### OLA 2 — Dominio backend y catálogo público

| MT | Macro tarea | Historias | Depende de |
| :-- | :-- | :-- | :-- |
| **MT2.1** | **Dominio de inmuebles y media** — ciclo de vida del inmueble + código secuencial, URLs presignadas de R2 y confirmación/generación de derivados. Los endpoints de media validan `X-User-Role: admin` (AC1.8.1, MT1.2) y el alta de inmuebles **traduce y revalida** (US0.3/US0.5, MT1.4), por eso depende de MT1.2 y MT1.4 | US1.7, US1.8, US1.9 | MT1.1, MT1.2, MT1.4, MT0.3 (R2) |
| **MT2.2** | **Consulta pública** — filtros, orden por `createdAt` descendente, cursor e índices (tabla única en `./ARCHITECTURE.md`, AC1.10.4; su faceta de índices se verifica en MT6.1); y **endpoints públicos de lectura de contenido** (listado de servicios y documento Nosotros) que consume la portada/sitemap (US2.6, US2.7) y más tarde US5.1/US5.6 | US1.10, US7.4 (parte backend: `PropertyCard`, compresión, caché) | MT2.1, MT1.2, MT1.4 |
| **MT2.4** | **Seed de catálogo** — siembra los datos de ejemplo del catálogo (inmuebles repartidos por operación, servicios y documento Nosotros; AC6.1.2) **una vez existe el dominio** de MT2.1/MT2.2, para que el catálogo y el CMS se construyan contra datos reales. Idempotente (AC6.1.1) y con traductor falso (AC6.1.4) | US6.1 (catálogo) | MT2.1, MT2.2 |
| **MT2.3** | **Catálogo público (UI)** — pestañas, buscador, scroll infinito, ficha técnica con SEO y puntos de interés, WhatsApp, portada y SEO técnico. La insignia «Nuevo» se deriva de `createdAt` en el cliente (US1.11). La portada usa los endpoints públicos de MT2.2 y el **sitemap cierra aquí** sus rutas de inmuebles; las rutas de **Servicios, Nosotros y legales** se incorporan cuando existen (MT5.1/MT3.2), y ese cierre completo se re-scopa a **MT5.1** (ver MT5.1) | US1.11, US2.1, US2.2, US2.3, US2.4, US2.5, US2.6, US2.7, US7.1, US7.3, US7.4 (parte cliente) | MT2.2, MT2.4, MT1.3, MT0.4 |
| **MT3.2** | **Páginas legales (adelantadas a Ola 2)** — aviso de privacidad, política de tratamiento de datos y términos. Solo dependen de las rutas de MT0.4 y (para la traducción de cortesía en inglés) del servicio de US0.5 → MT1.4. Se adelantan para que el **consentimiento de MT3.1** (Ola 3) y el **sitemap de MT2.3** apunten a rutas reales desde el principio | US5.3 | MT0.4, MT1.4 |

### OLA 3 — Consignación y correo

| MT | Macro tarea | Historias | Depende de |
| :-- | :-- | :-- | :-- |
| **MT3.1** | **Consignación end-to-end** — formulario, consentimiento de datos, notificación con Resend y protección contra bots. Va por el BFF (US0.2) y usa el helper puro `buildWhatsAppUrl` (T3/US2.5) de `packages/client/src/lib/whatsapp.ts` (D35, MT0.4) en el respaldo de AC3.1.5. Su consentimiento enlaza a las páginas legales de **MT3.2** (Ola 2). No depende del catálogo (MT2.3) | US3.1, US3.2, US3.3, US3.4 | MT1.1, MT1.3, MT3.2, MT0.4, MT0.3 (Resend) |

### OLA 4 — CMS y gestión

| MT | Macro tarea | Historias | Depende de |
| :-- | :-- | :-- | :-- |
| **MT4.1** | **CMS de inmuebles y media** — CRUD de inmuebles, uploader de fotos con reordenamiento/portada, videos y panorámicas 360°. Bajo el guard de sesión de `/admin` (DoD §2.6/US1.5, MT1.2) y reutiliza los componentes públicos de tarjeta/ficha en las vistas previas (AC4.1.9, MT2.3). Cubre también la parte de **US7.4 aplicable al panel** (TanStack Query, debounce, timeouts) | US4.1, US4.2, US4.3, US7.4 (panel), US7.5 | MT2.1, MT1.4, MT1.3, MT1.2, MT2.3 |
| **MT4.2** | **CMS de contenido** — gestión de Servicios y de la página «Nosotros». Bajo el guard de sesión de `/admin` (MT1.2) y reutiliza el flujo de fotos de US4.2 (AC4.4.6), por eso depende de MT4.1 | US4.4, US4.5, US7.1 (panel), US7.5 (listas y borradores) | MT1.4, MT1.3, MT1.2, MT4.1 |

### OLA 5 — Contenido público y contacto

| MT | Macro tarea | Historias | Depende de |
| :-- | :-- | :-- | :-- |
| **MT5.1** | **Páginas públicas de contenido** — índice/detalle de Servicios, pie de página y contacto, página «Nosotros». Leen los endpoints públicos de MT2.2 y el seed de MT2.4 (no dependen del CMS: el contenido del seed ya existe), usan el helper `buildWhatsAppUrl` de `packages/client/src/lib/whatsapp.ts` (D35, MT0.4) y reutilizan el SEO técnico y el layout de MT2.3. **Aquí se cierra el sitemap completo** de US2.7 (al existir ya Servicios, Nosotros y las legales de MT3.2) | US5.1, US5.2, US5.6, US7.1 (contacto) | MT2.2, MT2.4, MT2.3, MT0.4 |
| **MT5.2** | **Contacto editable (COULD)** — configuración de contacto desde el panel | US5.5 | MT4.2 |

### OLA 6 — Operación y cierre

| MT | Macro tarea | Historias | Depende de |
| :-- | :-- | :-- | :-- |
| **MT6.1** | **Cierre de despliegue y documentación** — índices, README, `ADMIN-GUIDE.md`, `apphosting.yaml` y despliegue final. Documenta el CMS (AC6.3.4: subir fotos, portada, inmuebles, servicios, Nosotros → MT4.1/MT4.2) y verifica que el BFF y la revalidación alcanzan la app (AC6.3.6 → MT1.1/MT1.4). **Aquí se cierra AC6.2.2** (índices = combinaciones documentadas), cuando los índices de US1.10/MT2.2 ya existen. **Despliega el producto completo**, por eso depende de todas las MT de producto (`MT2.3`, `MT3.1`, `MT5.1`) además del CMS. **Precede a MT6.2**: no se endurece ni se miden presupuestos sobre algo no desplegado | US6.3 (resto) | MT1.5, MT2.2, MT2.3, MT3.1, MT4.1, MT4.2, MT5.1, MT0.3 |
| **MT6.2** | **Hardening y QA final** — repaso de `[Debe NOT]`, cobertura, accesibilidad y regresión; **cierre de los gates de rendimiento móvil (US7.2/US7.6)**: Lighthouse móvil y presupuesto de bundles que fallan la build. Corre **después** de MT6.1 (el producto ya está desplegado) y depende de **todas las MUST/SHOULD**, **no** de las diferibles (MT5.2 y MT6.3 quedan fuera de su conjunto de dependencias) | US7.2, US7.6 (transversal a todas las MUST/SHOULD) | MT6.1 + todas las MUST/SHOULD (excluye MT5.2 y MT6.3) |
| **MT6.3** | **Autorización por roles (COULD, diferible)** — **extiende** el rol único `admin` de MT1.2 a roles/permisos múltiples (p. ej. editor vs. admin) vía `X-User-Role`. En v1 MT1.2 ya resuelve un rol único; lo diferible es la distinción de permisos, no la autorización básica | US1.12 (extensión de MT1.2) | MT1.2 |

---

## GRAFO DE DEPENDENCIAS (nivel MT)

Se dibujan **solo las aristas directas** (sin las redundantes por transitividad); la fuente exacta es la columna «Depende de» de cada tabla de ola.

```
FASE 0
  MT0.1 ──> MT0.2            (ramas/commits/DoD se aplican en el repo)
  MT0.1 ──> MT0.3
  MT0.2 ──> MT0.4
  MT0.3 ──┐
  MT0.4 ──┴──> MT0.5         (esqueleto desplegable)

OLA 1
  MT0.3 ──> MT1.1
  MT0.4 ──> MT1.1            MT0.5 ──> MT1.1
  MT0.4 ──> MT1.3
  MT1.1 ──> MT1.2 ──> MT6.3
  MT1.1 ──> MT1.4
  MT0.5 ──> MT1.5            MT1.1 ──> MT1.5        MT1.4 ──> MT1.5   (seed usa traductor falso)

OLA 2
  MT1.1 ──> MT2.1            MT1.2 ──> MT2.1        MT1.4 ──> MT2.1   (alta traduce/revalida)
  MT2.1 ──> MT2.2            MT1.2 ──> MT2.2        MT1.4 ──> MT2.2   (tarea «Nuevo» → revalidación)
  MT2.1 ──> MT2.4            MT2.2 ──> MT2.4        (seed de catálogo tras el dominio)
  MT2.2 ──> MT2.3            MT2.4 ──> MT2.3        MT1.3 ──> MT2.3   MT0.4 ──> MT2.3
  MT0.4 ──> MT3.2            MT1.4 ──> MT3.2        (legales adelantadas)

OLA 3
  MT1.1 ──> MT3.1            MT1.3 ──> MT3.1        MT3.2 ──> MT3.1   (consentimiento → legales)
                                                     (helper WhatsApp ya vive en MT0.4)

OLA 4
  MT2.1 ──> MT4.1            MT1.4 ──> MT4.1        MT1.3 ──> MT4.1
                             MT1.2 ──> MT4.1        (guard /admin)
                             MT2.3 ──> MT4.1        (vistas previas reutilizan UI pública)
  MT1.4 ──> MT4.2            MT1.3 ──> MT4.2        MT1.2 ──> MT4.2
                             MT4.1 ──> MT4.2        (galería reutiliza US4.2)

OLA 5
  MT2.2 ──> MT5.1            MT2.4 ──> MT5.1        MT2.3 ──> MT5.1   MT0.4 ──> MT5.1
                                                     (cierra el sitemap completo)
  MT4.2 ──> MT5.2

OLA 6
  MT1.5 ──> MT6.1            MT2.2 ──> MT6.1        MT2.3 ──> MT6.1   MT3.1 ──> MT6.1
  MT4.1 ──> MT6.1            MT4.2 ──> MT6.1        MT5.1 ──> MT6.1
  MT6.1 ──> MT6.2            (todas las MUST/SHOULD ──> MT6.2, excl. MT5.2/MT6.3)
  MT1.2 ──> MT6.3
```

**Resumen de aristas directas por MT (idéntico a las tablas):** MT0.2←MT0.1 · MT0.3←MT0.1 · MT0.4←MT0.2 · MT0.5←{MT0.3,MT0.4} · MT1.1←{MT0.3,MT0.4,MT0.5} · MT1.2←{MT1.1,MT0.3} · MT1.3←{MT0.4} · MT1.4←{MT1.1,MT0.3} · MT1.5←{MT0.5,MT1.1,MT1.4} · MT2.1←{MT1.1,MT1.2,MT1.4,MT0.3} · MT2.2←{MT2.1,MT1.2,MT1.4,MT0.3} · MT2.4←{MT2.1,MT2.2} · MT2.3←{MT2.2,MT2.4,MT1.3,MT0.4} · MT3.2←{MT0.4,MT1.4} · MT3.1←{MT1.1,MT1.3,MT3.2,MT0.4,MT0.3} · MT4.1←{MT2.1,MT1.4,MT1.3,MT1.2,MT2.3} · MT4.2←{MT1.4,MT1.3,MT1.2,MT4.1} · MT5.1←{MT2.2,MT2.4,MT2.3,MT0.4} · MT5.2←{MT4.2} · MT6.1←{MT1.5,MT2.2,MT2.3,MT3.1,MT4.1,MT4.2,MT5.1,MT0.3} · MT6.2←{MT6.1 + todas las MUST/SHOULD, excl. MT5.2/MT6.3} · MT6.3←{MT1.2}.

> Aristas **omitidas por transitividad** (no se repiten en cada MT destino; ya se alcanzan por otra ruta declarada): `MT0.3→MT1.2` (por MT1.1), `MT0.3→MT1.4` (por MT1.1), `MT0.3→MT2.1`/`MT0.3→MT3.1` (por MT1.1), `MT0.4→MT5.1` (por MT2.3), `MT1.1→MT4.1` (por MT2.1), `MT2.1→MT4.2` (por MT4.1), `MT1.2→MT5.1` (por la cadena MT2.1→MT2.2→MT2.3→MT5.1), `MT1.4→MT6.1` (por MT2.2), `MT0.5→MT6.1` (por MT1.5). Las aristas que **sí** se declaran directas aunque exista una ruta más larga lo hacen porque el AC que las exige nombra el artefacto concreto: `MT1.2→MT2.1`/`MT4.1`/`MT4.2` (rol y guard de `/admin`), `MT2.2→MT6.1` (cierre de AC6.2.2).
>
> **Sin ciclos:** todas las aristas respetan el orden de olas (0 → 1 → 2 → 3 → 4 → 5 → 6). Las intra-ola (`MT0.1→MT0.2`, `MT0.3/MT0.4→MT0.5`, `MT1.1→MT1.2`, `MT1.1→MT1.4`, `MT1.1→MT1.5`, `MT1.4→MT1.5`, `MT2.1→MT2.2`, `MT2.1/MT2.2→MT2.4`, `MT2.2/MT2.4→MT2.3`, `MT4.1→MT4.2`, `MT6.1→MT6.2`) son igualmente acíclicas.
>
> **Cierre del cluster portada/sitemap:** la portada (US2.6) cierra en Ola 2 (endpoints públicos de MT2.2 + seed de MT2.4); el **sitemap completo (US2.7) cierra en MT5.1**, cuando ya existen Servicios, Nosotros y las legales de MT3.2. Así `MT2.3↔MT5.1` no forman ciclo: MT2.3→MT5.1 es la única dirección.

**Cadena crítica (real):** `MT0.1 → MT0.2 → MT0.4 → MT0.5 → MT1.1 → MT1.2 → MT2.1 → MT2.2 → MT2.3 → MT4.1 → MT4.2 → MT5.1 → MT6.1 → MT6.2`. La autenticación (`MT1.2`) **es parte de la cadena crítica** (precede a las rutas admin `MT2.1`/`MT4.1`/`MT4.2`); `MT1.3`/`MT1.4` corren en paralelo dentro de su ola.

---

## BLOQUEOS Y DEPENDENCIAS QUE AFECTAN EL ORDEN

Esta tabla recoge toda prelación **no evidente** (las obvias están en las columnas «Depende de»). Sirve para justificar el orden y para no arrancar una MT antes de tiempo.

| Prelación | Naturaleza | Por qué (fuente) | Efecto en el plan |
| :-- | :-- | :-- | :-- |
| **MT1.2 (auth) → MT2.1, MT4.1, MT4.2** | Técnica | AC1.8.1 (media valida `X-User-Role`) y DoD §2.6 (guard de `/admin`) | La auth va en Ola 1, antes de cualquier ruta admin. |
| **MT1.2 lleva el seed de `authorized_users`** | Técnica | US1.1/AC1.1.2 exigen la lista blanca para poder iniciar sesión; sin sembrarla, la auth no es verificable | El seed de admins **no** va en el seed de catálogo (MT2.4): pertenece a la auth. |
| **MT1.4 (revalidación/traducción) → MT2.1, MT2.2, MT6.1** | Técnica | El alta de inmuebles traduce y revalida (US1.7/US0.3/US0.5); AC6.3.6 | US0.3/US0.5 preceden a toda escritura del dominio, no solo al CMS. |
| **MT1.4 (traductor) → MT1.5, MT2.4 (seed)** | Técnica | AC6.1.4 (el seed usa el traductor falso de AC0.5.9) | El seed no llama al proveedor real de traducción. |
| **MT2.1/MT2.2 → MT2.4 (seed de catálogo)** | Técnica | El seed siembra inmuebles (`JF-XXXX`), derivados de fotos y combinaciones de filtros que solo existen tras el dominio | El seed de catálogo va **después** del dominio y **antes** del catálogo (MT2.3). |
| **MT2.2 (endpoints públicos de servicios/Nosotros) → MT2.3 (US2.6)** | Técnica | AC2.6.2/AC2.6.4 (portada) necesitan datos de contenido | **Rompe el cluster**: la portada cierra en Ola 2 sin esperar al CMS. |
| **MT2.3 cierra el sitemap de inmuebles; MT5.1 cierra el sitemap completo** | Técnica | AC2.7.3 (el sitemap lista también Servicios, Nosotros y legales, no disponibles en Ola 2) | El sitemap completo **se re-scopa a MT5.1**; así MT2.3↔MT5.1 no forma ciclo. |
| **`buildWhatsAppUrl` se implementa en MT0.4** | Contrato (T3) | Es una función pura que vive fuera del catálogo (`packages/client/src/lib/whatsapp.ts`, D35); implementarla temprano libera a MT3.1 y MT5.1 de depender del catálogo (MT2.3) | Caen dos aristas artificiales (MT3.1←MT2.3 y MT5.1←MT2.3). |
| **MT5.1 no depende del CMS** | Técnica | El contenido público de Servicios/Nosotros se lee del seed (MT2.4), no del CMS (MT4.2); el CMS solo lo edita | MT5.1←MT4.1/MT4.2 era artificial: se elimina. |
| **MT3.2 (legales) → MT3.1 y al sitemap** | Contrato | AC3.3.1 (el consentimiento enlaza a la Política) y AC2.7.3 (el sitemap lista las legales) | Las legales se adelantan a **Ola 2** (solo dependen de MT0.4/MT1.4); resuelven antes de que MT3.1 y MT5.1 las referencien. |
| **MT2.3 (vistas previas) → MT4.1** | UI | AC4.1.9 (el editor reutiliza los componentes de tarjeta/ficha públicos) | No reimplementar componentes de catálogo en el CMS. |
| **MT4.1 (US4.2 uploader) → MT4.2** | UI | AC4.4.6 (la galería de servicios reutiliza el flujo de fotos) | Dentro de Ola 4: primero inmuebles, luego contenido. |
| **MT4.1, MT4.2 → MT6.1** | Documental | AC6.3.4 (`ADMIN-GUIDE` documenta el CMS: fotos, portada, servicios, Nosotros) | El cierre documenta funcionalidad ya existente. |
| **MT6.1 → MT6.2 (el despliegue precede al hardening)** | Técnica | No se mide rendimiento (Lighthouse/bundles) ni se endurece sobre un producto sin desplegar | El cierre y despliegue (MT6.1) va **antes** de MT6.2. |
| **MT6.2 depende solo de las MUST/SHOULD** | Técnica | Las diferibles (MT5.2, MT6.3) no deben bloquear el release | MT6.2 excluye MT5.2 y MT6.3 de su conjunto de dependencias. |
| **AC6.2.1 (alerta de presupuesto) se activa en MT0.3** | Técnica | El Blaze se contrata en MT0.3; la alerta debe existir desde el primer gasto | No en Ola 1: va con el plan Blaze. |
| **AC6.2.2 (índices) verificado en MT6.1** | Técnica | El estado «índices = combinaciones documentadas» solo es cierto tras US1.10 (MT2.2) | US6.2 cierra su faceta de índices en MT6.1, no en Ola 1. |
| **Gates de rendimiento informativos desde MT0.4** | Técnica | US7.2/US7.6 se configuran en MT0.4; bloquear desde el inicio frena el desarrollo sin superficie que medir | Informativos desde MT0.4; cobertura incremental de `lighthouserc.json` (MT2.3, MT3.2, MT3.1, MT5.1) y set completo antes del gate; bloqueantes en MT6.2 para todas las rutas de AC7.2.1. Las mediciones de MT2.3 son referencia, no gate. |
| **AC5.4.7 (redirección al login) se re-scopa a US1.5** | Técnica | AC5.4.7 referencia AC1.5.4 (US1.5); dejarla en US5.4 crea un ciclo story-level MT1.2↔MT1.3 | MT1.3 (US5.4) queda sin depender de MT1.2. |
| **US1.12 (MT6.3) es extensión, no duplicado** | Alcance | MT1.2 ya resuelve el rol único `admin`; US1.12 añade la distinción de permisos | MT6.3 = roles/permisos múltiples (COULD), no la autorización básica. |
| **Contenido legal real (cliente)** | Externa | AC5.3.4 (revisión jurídica antes de producción) | Dependencia externa; no bloquea el desarrollo, sí el release. |

---

## ASIGNACIÓN SUGERIDA (2 devs)

| Dev | Foco | Macro tareas |
| :-- | :-- | :-- |
| **Dev 1** (backend) | **BFF (servidor)**, auth (+ seed de admins), dominio de inmuebles, media, correo, revalidación/traducción | MT1.1, MT1.2, MT1.4, MT2.1, MT2.2, MT3.1 |
| **Dev 2** (frontend) | UI: ciclo de sesión, catálogo, CMS, páginas públicas y legales | MT1.3 (front), MT2.3, MT3.2, MT4.1, MT4.2, MT5.1, MT5.2 |
| **Compartidas (Fullstack)** | Fundaciones, esqueleto desplegable, operación, seed de catálogo, cierre y `shared-types` | MT0.2, MT0.3, MT0.4, MT0.5, MT1.5, MT2.4, MT6.1, MT6.2 |

> **Sobre el reparto de la Ola 1:** `MT1.3` (cliente HTTP, US5.4) puede arrancar en paralelo con `MT1.2` porque ya **no depende** de la auth (ver el re-scope de AC5.4.7). Con el contrato OpenAPI de MT0.4 y mocks, además, **Dev 2 puede empezar el catálogo (MT2.3) antes** de que termine el backend: el contrato y el seed base permiten construir la UI contra respuestas simuladas.

### Propiedad de código (frontera BFF)

El **BFF es código de servidor de Next.js** y se asigna a **Dev 1** aunque viva físicamente en `packages/client`. La separación es **por carpeta, no por paquete**:

| Ruta | Responsable | Contenido |
| :-- | :-- | :-- |
| `packages/client/src/app/api/**` | **Dev 1** | Route handlers del BFF, **uno por ruta y sin *catch-all*** (D31): `/api/auth/session`, `/api/auth/logout`, `/api/auth/me`, `/api/properties*`, `/api/services*`, `/api/media/*`, `/api/consignments`, `/api/about`, `/api/revalidate`. El router de Next.js es la allowlist |
| `packages/client/src/server/**` | **Dev 1** | `routes.ts` (catálogo generado desde `./openapi.bff.yaml`: mapeo ruta pública ↔ interna y política de sesión, D31/AC0.1.8) y `session/jwt.ts` (el BFF ya no usa Firebase Admin; la verificación del idToken vive en `packages/functions/**`) |
| `packages/client/src/proxy.ts` | **Dev 1** | Cierre de superficie (404/405) y allowlist de `/api/*` (D32, AC0.1.6). **No** valida sesión ni propaga `X-User-*`; eso ocurre en el envoltorio del route handler. En **Next 16** la convención `middleware` se renombró a **`proxy`**; con carpeta `src/`, el archivo debe vivir en `src/proxy.ts` (no en la raíz, o Next lo ignora) |
| `packages/client/**` (resto) | **Dev 2** | Componentes React, TanStack Query, SDK cliente de Firebase |
| `packages/functions/**` | **Dev 1** | Backend (Clean Architecture) |
| `packages/shared-types/**` | **Fullstack** | Contratos y tipos (US0.1) |
| `packages/client/src/lib/whatsapp.ts` | **Dev 2** | Helper puro `buildWhatsAppUrl` (T3, US2.5; D35) |

**Reasignación reflejada en `./TASKS.md`:** US0.2, US1.2, US1.3 y US1.6 → **Dev 1**; US1.4 y US5.4 → **Fullstack**; US1.5 permanece en **Dev 2** (SDK de cliente y UI). US5.3 (legales, MT3.2) se asigna a **Dev 2** (contenido estático + rutas i18n). MT0.5 (esqueleto desplegable) y MT2.4 (seed de catálogo) son **Fullstack**.

Reglas:
- El código de `src/server/**` es **server-only**; prohibido importarlo desde componentes cliente (paquete `server-only` + regla de lint).
- La frontera entre ambos es el **contrato** de `shared-types` (US0.1).
- El **`proxy` (AC0.1.6)** afecta al enrutado: requiere coordinación entre devs y se define temprano (Ola 1). La sesión se valida en el route handler (D32).

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
| US1.11 | Insignia «Nuevo» derivada de `createdAt` en el frontend | MT2.3 | 2 |
| US1.12 | Autorización por roles/permisos múltiples (**COULD**, extensión de MT1.2) | MT6.3 | 6 |
| US2.1 | Navegación por pestañas independientes | MT2.3 | 2 |
| US2.2 | Buscador con filtros, skeletons y estados de carga | MT2.3 | 2 |
| US2.3 | Scroll infinito del listado | MT2.3 | 2 |
| US2.4 | Ficha técnica con SEO y puntos de interés | MT2.3 | 2 |
| US2.5 | Botón de WhatsApp y helper de enlaces (`buildWhatsAppUrl` → MT0.4) | MT2.3 (UI) / MT0.4 (helper) | 2 / Fase 0 |
| US2.6 | Portada (Home) | MT2.3 (lee endpoints públicos de MT2.2 y seed de MT2.4) | 2 |
| US2.7 | SEO técnico (ambos idiomas) | MT2.3 (inmuebles) / MT5.1 (cierre completo del sitemap) | 2 / 5 |
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
| US5.3 | Páginas legales | MT3.2 (adelantada a Ola 2) | 2 |
| US5.4 | Cliente HTTP centralizado y `ApiError` | MT1.3 | 1 |
| US5.5 | Configuración de contacto editable (**COULD**) | MT5.2 | 5 |
| US5.6 | Página «Nosotros» | MT5.1 | 5 |
| US6.1 | Datos de ejemplo reproducibles (andamiaje MT1.5; seed de catálogo MT2.4) | MT1.5 / MT2.4 | 1 / 2 |
| US6.2 | Costos y presupuesto bajo control (alerta en MT0.3; índices en MT6.1) | MT0.3 / MT1.5 / MT6.1 | Fase 0 / 1 / 6 |
| US6.3 | Despliegue y documentación | MT1.5 / MT6.1 | 1 / 6 |
| US7.1 | Interfaz Mobile First | MT2.3, MT4.2, MT5.1 | 2 / 4 / 5 |
| US7.2 | Presupuesto de rendimiento y de datos | MT6.2 | 6 |
| US7.3 | Imágenes y multimedia bajo demanda | MT2.3 | 2 |
| US7.4 | API y caché eficientes para datos móviles | MT2.2 (backend) / MT2.3 (público) / MT4.1 y MT4.2 (panel) | 2 / 2 / 4 |
| US7.5 | Panel de administración y subidas con datos móviles | MT4.1 / MT4.2 | 4 |
| US7.6 | Calidad mobile first en pruebas y CI | MT0.4 / MT6.2 | Fase 0 / 6 |

---

## REGLAS DE SECUENCIACIÓN (resumen)

1. **Nada de producto antes de la Fase 0.** `MT0.1` (proceso/DoD) → `MT0.2` (repo/tooling) → `MT0.3` (infra + alerta de presupuesto) → `MT0.4` (contratos + i18n + gates informativos) → `MT0.5` (esqueleto desplegable) son prerequisito de todo.
2. **`US0.1` es la raíz:** tipos y contrato antes de cualquier implementación; el helper `buildWhatsAppUrl` se implementa en `MT0.4` pero vive en `packages/client/src/lib/whatsapp.ts` (D35), no en `shared-types`.
3. **`US0.4` (i18n) al inicio:** la estructura de rutas se construye una sola vez.
4. **`US5.4` adelantado y sin depender de la auth:** es infraestructura de front compartida; su redirección 401 (AC5.4.7) se **re-scopa a US1.5**, así `MT1.3` corre en paralelo con `MT1.2`.
5. **`MT1.2` (auth) antes de toda ruta de administrador:** `MT2.1` (media valida rol), `MT4.1` y `MT4.2` (guard de `/admin`). Lleva el **seed de `authorized_users`**.
6. **El dominio backend (`MT2.1`/`MT2.2`) es prerequisito del seed de catálogo (`MT2.4`), y este del catálogo (`MT2.3`) y del CMS (`MT4.1`).**
7. **`US0.3` y `US0.5` antes de toda escritura que traduzca/revalide:** alta de inmuebles (`MT2.1`), CMS (`MT4.x`), vigencia «Nuevo» (`MT2.2`) y seed (`MT1.5`/`MT2.4`).
8. **Contenido público de lectura temprano:** los endpoints públicos de servicios y Nosotros se entregan en `MT2.2`; la **portada** (`US2.6`) cierra en Ola 2, y el **sitemap completo** (`US2.7`) cierra en `MT5.1` (al existir Servicios, Nosotros y legales), sin esperar al CMS.
9. **Legales adelantadas (`MT3.2`, Ola 2):** solo dependen de `MT0.4` (+ `US0.5` para el inglés); se entregan antes de `MT3.1` y del cierre del sitemap, para que el consentimiento (`AC3.3.1`) y el sitemap (`AC2.7.3`) apunten a rutas reales.
10. **El helper de WhatsApp (`buildWhatsAppUrl`) vive en `packages/client/src/lib/whatsapp.ts` (`MT0.4`, D35)**, no en `shared-types` ni en el catálogo: es una función pura y no debe arrastrar dependencias hacia `MT3.1` ni `MT5.1`.
11. **El cierre y despliegue (`MT6.1`) precede al hardening (`MT6.2`):** no se endurece ni se miden presupuestos sobre un producto sin desplegar. `MT6.2` depende solo de las **MUST/SHOULD**, no de las diferibles (`MT5.2`, `MT6.3`).
