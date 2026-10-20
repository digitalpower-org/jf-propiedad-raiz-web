# Definition of Done (DoD)

**Proyecto:** Plataforma Web & CMS `jfpropiedadraiz.com`  
**Versión:** 1.0 · 19 de octubre de 2026  
**Base:** MT0.1 de `./DEVELOPMENT-PLAN.md` · `./TASKS.md` · presupuestos en `./PERFORMANCE.md` · proceso de verificación en `./QA.md` (pendiente)  
**Alcance:** define **cuándo** una historia, macro tarea, ola o release se considera *terminada*. No repite los criterios de aceptación (viven en `./TASKS.md`) ni el procedimiento de verificación (vivirá en `./QA.md`). **No incluye estimaciones.**

---

## CÓMO USAR ESTE DOCUMENTO

Tres piezas complementarias, sin solapamiento:

| Pieza | Responde a | Dónde vive |
| :---- | :---- | :---- |
| **AC** (`Dado / Cuando / Entonces`) | ¿Qué debe cumplir **esta** historia? | `./TASKS.md` |
| **DoD** | ¿Qué exige **toda** historia / MT / ola / release para estar terminada? | este documento |
| **QA** | ¿Con qué herramientas y gates se **verifica**? | `./QA.md` (pendiente) |

- Un AC se marca como `[agente]` (verificable sin persona) o `[manual]` (requiere persona); el DoD **no** repite los AC, solo exige que **todos** se cumplan.
- El DoD es **acumulativo por nivel**: cerrar una US exige el §2; cerrar una MT exige el §3 **y** el §2 de cada US; cerrar una ola/release exige el §4 además de lo anterior.

---

## 1. DEFINITION OF READY (DoR) — antes de empezar una US

Una historia está **lista para empezar** cuando:

- Sus AC están redactados como **Dado / Cuando / Entonces** y son verificables.
- Cada AC está clasificado `[agente]` o `[manual]`.
- Los criterios `\[Debe NOT\]` están declarados si la historia tiene restricciones negativas.
- Sus **dependencias** están cerradas (MT/olas predecesoras hechas) y los **pendientes** que la bloquean están resueltos.
- El **contrato** que consume existe y está publicado (`./openapi.backend.yaml` / `./openapi.bff.yaml`, `shared-types`).
- No hay ambigüedad abierta sin registrar como pendiente.

---

## 2. DoD DE HISTORIA (US)

Una US está **Done** cuando **todo** lo siguiente se cumple.

### 2.1 Funcional
- [ ] Pasan **todos** los AC `[agente]` (Playwright / Vitest / grep / curl, según `./QA.md`).
- [ ] Los AC `[manual]` están verificados por una persona; queda anotado **quién** y **cuándo**.
- [ ] **Ningún** criterio `\[Debe NOT\]` se incumple.
- [ ] Reglas transversales respetadas: **T1** (ningún texto visible en JSX), **T2** (sin secretos, teléfonos, direcciones ni correos reales), **T3** (todo enlace de WhatsApp usa `buildWhatsAppUrl`).

### 2.2 Calidad de código
- [ ] `build` + `lint` + `format` en verde en todo el monorepo.
- [ ] Tipos estrictos: sin `any`, sin `@ts-ignore` / `@ts-expect-error`.
- [ ] Sin errores de LSP en los archivos tocados.

### 2.3 Pruebas
- [ ] Tests unitarios e de integración de lo nuevo, según `./QA.md`.
- [ ] **Cobertura:** ≥ **80 %** en lógica de dominio (backend `packages/functions` y `packages/shared-types`). La **UI no exige umbral** de cobertura; se protege con **E2E de los flujos críticos**.
- [ ] Sin tests deshabilitados (`.skip`, `xit`, `test.todo`) sin justificación registrada.

### 2.4 Contrato
- [ ] Si la US toca la API: `./openapi.backend.yaml` y/o `./openapi.bff.yaml` actualizados y coherentes con el código.
- [ ] `shared-types` actualizados; el código compila contra ellos.

### 2.5 i18n y contenido
- [ ] Todo texto visible sale de `messages/es.json` y `messages/en.json` (o de la DB); **nada** hardcodeado en JSX.
- [ ] Ambos idiomas completos para lo nuevo (`es` por defecto; `en` generado por US0.5 cuando aplique).
- [ ] El editor de inmuebles muestra el par `es`/`en` editable, el interruptor individual y el global de `autoTranslate` (activo por defecto) y el indicador «Actualizada»/«Pendiente» con la regla de AC0.5.11 (US4.1).

### 2.6 Seguridad
- [ ] Sin secretos ni datos reales versionados (T2); los secretos se inyectan vía **Secret Manager** y nunca aparecen en el repositorio ni en texto plano en `apphosting.yaml`.
- [ ] La validación de identidad (idToken) y la autorización de rutas de administrador se verifican en el **backend**; el **BFF** valida su propia sesión (cookie) y propaga la identidad. **Nunca** solo en el cliente.
- [ ] Las rutas `/admin` quedan tras el guard de sesión.

### 2.7 Accesibilidad (solo US de front)
- [ ] Navegación completa por teclado; foco visible.
- [ ] Sin violaciones **críticas** de accesibilidad (p. ej. axe).

### 2.8 Proceso
- [ ] PR creado contra `dev`, con **CI en verde** (ver §5).
- [ ] El `Estado` de la US queda en `[x]` en `./TASKS.md`.
- [ ] La documentación afectada queda actualizada (`./AUTHENTICATION.md`, plan, etc.). Esta actualización debe quedar **registrada en comentarios nuevos agregados al documento** modificado. Si el ítem puede marcarse con `[x]`, **se debe usar ese método**.

### 2.9 Ejecutable
- [ ] Funciona en local (emuladores) y en **staging**, sin pasos manuales no documentados.

### 2.10 Mobile First y Rendimiento (Épica 7 — aplica a toda US)

- [ ] La US se verificó primero a **375 px** y con red lenta antes de revisar la versión de escritorio (AC7.6.4).
- [ ] Si toca UI: estilos base móvil, cambios de escritorio solo con `min-width`, controles ≥ 44 × 44 px, campos ≥ 16 px, cuerpo de texto ≥ 16 px y sin desplazamiento horizontal a 320/375/414 px (US7.1).
- [ ] Si toca imágenes o multimedia: `srcset`/`sizes`/`width`/`height` declarados, carga diferida salvo la principal, y ninguna petición a `/_next/image` (US7.3).
- [ ] Si toca API o datos: respuesta mínima por vista, caché y `staleTime` según US7.4, y sin datos que la vista no muestra.
- [ ] Si toca el editor o subidas: pre-reducción en el navegador antes de subir (AC4.2.9) y política de subidas móviles de US7.5.
- [ ] Se comprobó que no se incumple ningún presupuesto de `./PERFORMANCE.md` (US7.2).
- [ ] La documentación afectada incluye, cuando cambia, el ajuste a `./PERFORMANCE.md` o `./ARCHITECTURE.md`.

---

## 3. DoD DE MACRO TAREA (MT)

Una MT está **Done** cuando:

- [ ] Todas sus US están en `[x]` (se cumplió el §2 en cada una).
- [ ] Existe al menos un **test E2E del flujo completo** de la MT, y pasa.
- [ ] La **suite completa** del repositorio pasa (sin regresiones).
- [ ] El **contrato** con las MT vecinas sigue intacto.

---

## 4. DoD DE OLA / RELEASE v1

**Ola:**
- [ ] Todas las MT de la ola cerradas (§3).
- [ ] El flujo de la ola es **demostrable** de punta a punta (demo reproducible).
- [ ] La deuda nueva que bloquee queda registrada como pendiente.

**Release v1:**
- [ ] Todas las US `MUST` en `[x]`; las `SHOULD` evaluadas (hechas o diferidas con motivo); las `COULD` diferidas explícitamente.
- [ ] **QA final (MT6.2)** superado: repaso de `\[Debe NOT\]`, cobertura, accesibilidad y regresión.
- [ ] **Rendimiento móvil (US7.2/US7.6)** superado: Lighthouse móvil dentro de presupuesto en las rutas de AC7.2.1 y bundles dentro de límite (valores y perfil en `./PERFORMANCE.md`).
- [ ] **Verificación en dispositivo real (US7.6.6):** un Android de gama media probó listado con filtros, ficha, consignación y carga de una foto en el panel.
- [ ] Despliegue documentado (`firestore.indexes.json`, `README`, `ADMIN-GUIDE.md`, `apphosting.yaml`).
- [ ] Costos / presupuesto bajo control (US6.2).

---

## 5. RAMAS, COMMITS Y PR (acordado)

### 5.1 Ramas

| Rama | Propósito | Reglas |
| :---- | :---- | :---- |
| `main` | **Producción** | Protegida: **sin push directo**. Solo recibe merges desde `dev` (aprobados). |
| `dev` | **Integración** + despliegue a **staging / desarrollo** | Protegida: **sin push directo**. Recibe PRs de ramas cortas. |
| `feat/usX.y` (o `fix/…`) | Trabajo de **una** US | Sale de `dev`; se integra a `dev` por PR. **Corta**. |

**Flujo:** `feat/usX.y` → PR → `dev` (CI en verde) → despliegue a **staging** → (cuando el release está listo y aprobado) PR `dev` → `main` → despliegue a **producción**.

### 5.2 Commits

- **Conventional Commits**, con referencia a la US: `feat(us1.2): canje de idToken por sesión propia`, `fix(us2.3): …`.
- Cada commit debe **compilar** y pasar **lint**.

### 5.3 PR

- **Hacia `dev`:** se exige **CI en verde**; el **auto-merge** está permitido (sin aprobación humana obligatoria).
- **`dev` → `main` (release):** se exige **CI en verde** **y aprobación** antes del merge (`main` solo recibe cambios *aprobados*).
- El PR describe la(s) US/AC cubiertas y enlaza el `Estado` de `./TASKS.md`.

---

## 6. RESUMEN DE GATES

| Gate | Herramienta | Umbral |
| :---- | :---- | :---- |
| Build | `tsc` / Next build / Functions build | 0 errores |
| Lint / format | ESLint + Prettier | 0 errores |
| Tipos | TS `strict` | sin `any` / ignores |
| Tests unit / integración | Vitest (según `./QA.md`) | cobertura **backend ≥ 80 %** |
| E2E | Playwright (según `./QA.md`) | flujos críticos por MT y por ola |
| Contrato | validación OpenAPI | specs y `shared-types` coherentes |
| Seguridad | grep de secretos + revisión BFF/backend | sin secretos; validación de identidad y autorización en el backend |
| i18n | grep JSX / paridad es-en | sin texto hardcodeado |
| Accesibilidad | axe (front) | sin violaciones críticas |
| Rendimiento móvil | Lighthouse (perfil de `./PERFORMANCE.md`) | ≥ 85 · LCP ≤ 2,5 s · CLS ≤ 0,1 · TBT ≤ 300 ms (AC7.2.1) |
| Presupuesto de bundles | análisis de bundles (script de MT0.4) | JS inicial ≤ 200 KB · página ≤ 1 MB · ficha ≤ 1,5 MB (AC7.2.2/AC7.2.3) |
| Mobile First | Playwright proyecto táctil por defecto (375 × 667) | toda la suite e2e corre en móvil (AC7.6.1) |
