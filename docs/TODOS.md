# TODOS — Seguimiento de progreso

> **Proyecto:** jfpropiedadraiz.com · **Fuente de alcance:** `docs/DEVELOPMENT-PLAN.md` y `TASKS.md` (decisiones D1–D36).
> Este archivo solo registra **estado**. Para detalle, criterios de aceptación y justificaciones, consultar el plan y `TASKS.md`.

## Reglas para agentes

1. Marcar `[x]` solo cuando se cumpla el DoD de ese nivel (`docs/DEFINITION-OF-DONE.md`): historia (US) o macro tarea (MT).
2. Una MT se marca completa solo cuando **todas** sus historias (US) están marcadas y sus dependencias (`←`) están cerradas.
3. No iniciar una MT con dependencias abiertas. No editar el plan ni `TASKS.md` desde aquí; cualquier cambio de alcance se hace primero en esos documentos.
4. `COULD` = diferible: no bloquea el release ni a MT6.2.
5. Las prioridades `MUST`/`SHOULD` de cada historia están en `TASKS.md`.

**Cadena crítica:** MT0.1 → MT0.2 → MT0.4 → MT0.5 → MT1.1 → MT1.2 → MT2.1 → MT2.2 → MT2.3 → MT4.1 → MT4.2 → MT5.1 → MT6.1 → MT6.2

---

## FASE 0 — Habilitadores

- [ ] **MT0.1** Planificación, proceso y decisiones (DoD, ramas, commits, QA, flujos de auth) ← —
- [ ] **MT0.2** Repositorio y tooling (monorepo, lint/format, CI con 7 gates) ← MT0.1
- [ ] **MT0.3** Infraestructura, cuentas y entornos (Firebase Blaze, R2, Resend, Translation, Scheduler, Secret Manager, DNS, alerta de presupuesto AC6.2.1) ← MT0.1
- [ ] **MT0.4** Andamiaje técnico: contratos y base i18n ← MT0.2
  - [ ] US0.1 Contrato API (2 OpenAPI), `shared-types`, catálogo de errores y helper `buildWhatsAppUrl` (D35)
  - [ ] US0.4 Internacionalización por rutas `/es` y `/en`
  - [ ] US7.6 (arranque) Playwright móvil/escritorio, `lighthouserc.json`, análisis de bundles (gates informativos)
- [ ] **MT0.5** Esqueleto desplegable (App Hosting + Functions + Firestore, health + función trivial) ← MT0.3, MT0.4

> **Hito 0:** repo, CI, Firebase/emuladores, cuentas, secretos, alerta de presupuesto, contratos, i18n base y esqueleto desplegado.

---

## OLA 1 — Núcleo: autenticación, BFF y operación base

- [ ] **MT1.1** BFF y seguridad interna ← MT0.3, MT0.4, MT0.5
  - [ ] US0.2 BFF de Next.js, `routes.ts` generado, `proxy.ts` (404/405), `X-Internal-Key`
- [ ] **MT1.2** Autenticación end-to-end (incluye seed de `authorized_users`) ← MT1.1, MT0.3
  - [ ] US1.1 Lista blanca verificada por el backend
  - [ ] US1.2 `POST /api/auth/session`
  - [ ] US1.3 Guard y propagación de identidad (`X-User-*`)
  - [ ] US1.4 `POST /api/auth/logout`
  - [ ] US1.5 Front: ciclo de sesión, renovación, protección de `/admin` (incluye redirección 401, AC5.4.7)
  - [ ] US1.6 `GET /api/auth/me`
- [ ] **MT1.3** Fundamentos de front compartidos ← MT0.4
  - [ ] US5.4 Cliente HTTP centralizado y `ApiError`
- [ ] **MT1.4** Revalidación y traducción ← MT1.1, MT0.3
  - [ ] US0.3 Revalidación bajo demanda
  - [ ] US0.5 Traducción ES→EN selectiva por campo + edición manual
- [ ] **MT1.5** Operación base y despliegue temprano ← MT0.5, MT1.1, MT1.4
  - [ ] US6.1 (andamiaje) Datos de ejemplo reproducibles
  - [ ] US6.2 Costos y presupuesto bajo control
  - [ ] US6.3 (despliegue temprano)

---

## OLA 2 — Dominio backend y catálogo público

- [ ] **MT2.1** Dominio de inmuebles y media ← MT1.1, MT1.2, MT1.4, MT0.3
  - [ ] US1.7 Ciclo de vida del inmueble y código secuencial
  - [ ] US1.8 URLs presignadas de R2
  - [ ] US1.9 Confirmación de subida y derivados
- [ ] **MT2.2** Consulta pública y vigencia ← MT2.1, MT1.2, MT1.4, MT0.3
  - [ ] US1.10 Consulta pública (filtros, orden, cursor, índices)
  - [ ] US1.11 Bandera «Nuevo» (tarea programada)
  - [ ] US7.4 (backend) `PropertyCard`, compresión, caché
- [ ] **MT2.4** Seed de catálogo ← MT2.1, MT2.2
  - [ ] US6.1 (catálogo) Inmuebles, servicios y Nosotros; idempotente, traductor falso
- [ ] **MT2.3** Catálogo público (UI) ← MT2.2, MT2.4, MT1.3, MT0.4
  - [ ] US2.1 Pestañas independientes
  - [ ] US2.2 Buscador, skeletons y estados de carga
  - [ ] US2.3 Scroll infinito
  - [ ] US2.4 Ficha técnica con SEO y puntos de interés
  - [ ] US2.5 Botón de WhatsApp (usa `buildWhatsAppUrl`)
  - [ ] US2.6 Portada (Home)
  - [ ] US2.7 SEO técnico (parte inmuebles del sitemap)
  - [ ] US7.1 Interfaz Mobile First
  - [ ] US7.3 Imágenes y multimedia bajo demanda
  - [ ] US7.4 (cliente) API y caché eficientes
- [ ] **MT3.2** Páginas legales (adelantadas a Ola 2) ← MT0.4, MT1.4
  - [ ] US5.3 Aviso de privacidad, tratamiento de datos y términos

---

## OLA 3 — Consignación y correo

- [ ] **MT3.1** Consignación end-to-end ← MT1.1, MT1.3, MT3.2, MT0.4, MT0.3
  - [ ] US3.1 Formulario «Consigne su Propiedad»
  - [ ] US3.2 Notificación por correo con Resend
  - [ ] US3.3 Consentimiento de tratamiento de datos
  - [ ] US3.4 Protección contra bots y límite de envíos

---

## OLA 4 — CMS y gestión

- [ ] **MT4.1** CMS de inmuebles y media ← MT2.1, MT1.4, MT1.3, MT1.2, MT2.3
  - [ ] US4.1 CRUD de inmuebles
  - [ ] US4.2 Uploader de fotos con reordenamiento y portada
  - [ ] US4.3 Videos y panorámicas 360°
  - [ ] US7.4 (panel) TanStack Query, debounce, timeouts
  - [ ] US7.5 Panel y subidas con datos móviles
- [ ] **MT4.2** CMS de contenido ← MT1.4, MT1.3, MT1.2, MT4.1
  - [ ] US4.4 Gestión de Servicios
  - [ ] US4.5 Gestión de la página «Nosotros»
  - [ ] US7.1 (panel) Mobile First
  - [ ] US7.5 (listas y borradores)

---

## OLA 5 — Contenido público y contacto

- [ ] **MT5.1** Páginas públicas de contenido ← MT2.2, MT2.4, MT2.3, MT0.4
  - [ ] US5.1 Índice y páginas de Servicios
  - [ ] US5.2 Pie de página y Contacto
  - [ ] US5.6 Página «Nosotros»
  - [ ] US7.1 (contacto) Mobile First
  - [ ] US2.7 (cierre) Sitemap completo (Servicios, Nosotros y legales)
- [ ] **MT5.2** Contacto editable `COULD` ← MT4.2
  - [ ] US5.5 Configuración de contacto desde el panel

---

## OLA 6 — Operación y cierre

- [ ] **MT6.1** Cierre de despliegue y documentación ← MT1.5, MT2.2, MT2.3, MT3.1, MT4.1, MT4.2, MT5.1, MT0.3
  - [ ] US6.3 (resto) README, `ADMIN-GUIDE.md`, `apphosting.yaml`, despliegue final
  - [ ] AC6.2.2 Índices = combinaciones documentadas
- [ ] **MT6.2** Hardening y QA final ← MT6.1 + todas las MUST/SHOULD (excluye MT5.2 y MT6.3)
  - [ ] Repaso de `[Debe NOT]`, cobertura, accesibilidad y regresión
  - [ ] US7.2 Presupuesto de rendimiento y de datos (gates bloqueantes)
  - [ ] US7.6 (cierre) Lighthouse móvil y presupuesto de bundles fallan la build
- [ ] **MT6.3** Autorización por roles múltiples `COULD` ← MT1.2
  - [ ] US1.12 Roles/permisos múltiples (extensión de MT1.2)