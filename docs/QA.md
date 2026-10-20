# docs/QA.md: Protocolo de Calidad del Monorepo

**Proyecto:** Plataforma Web & CMS `jfpropiedadraiz.com` · **Fecha:** 2026-10-20
**Naturaleza:** **único punto de verdad operativo de calidad**: aquí viven los comandos, el harness de pruebas y los gates. Los AC (QUÉ) viven en `./TASKS.md`; las reglas de cierre (REGLAS) en `./DEFINITION-OF-DONE.md`; los valores numéricos de rendimiento en `./PERFORMANCE.md`.

> **Gestor de paquetes:** **npm únicamente** (`ARCHITECTURE.md` §7). Ningún comando de este documento usa pnpm/yarn/bun.
> **Contratos:** `docs/PRD.md` es definitivo (regenerado alineado a `TASKS.md`). Las specs API son `docs/openapi.backend.yaml` (interna, BFF ↔ Functions) y `docs/openapi.bff.yaml` (pública, navegador ↔ BFF), ambas definitivas según D26; `@jf/shared-types` genera sus tipos con `npm run build:types -w @jf/shared-types`.
> **Estado del harness:** las herramientas de este protocolo están instaladas (§1.3), salvo `lighthouserc.json`, los workflows de CI y el script `npm run emulators`. Cada bloque indica si corre **HOY** o es **objetivo** (MT0.2/MT0.4/MT6.2).

---

## 1. Visión general & harness de pruebas

### 1.1 Separación de responsabilidades (sin solapamiento)

| Documento | Responde a | Contenido |
|---|---|---|
| `TASKS.md` | **QUÉ** debe cumplir | Historias US y criterios AC (Dado/Cuando/Entonces), marcados `[agente]` o `[manual]` |
| `DEFINITION-OF-DONE.md` | **REGLAS** para estar terminado | DoR, DoD de US/MT/ola, ramas, commits, gates (§6) |
| `QA.md` (este) | **CÓMO** se verifica (herramientas y comandos) | Harness, comandos, cobertura, protocolo agente/manual, orden de gates de CI |

Regla: si un AC dice *qué*, el DoD dice *cuándo cuenta como hecho* y este documento dice *con qué comando se comprueba*. Un AC nuevo sin comando de verificación aquí está incompleto.

### 1.2 Harness de pruebas

#### Emuladores de Firebase (entorno de pruebas local)
- Configuración en `firebase.json`: Auth `:9099`, Functions `:5001`, Firestore `:8080`, UI emuladores habilitada, `singleProjectMode`.
- **Levantar (objetivo, script a crear):** `npm run emulators` → `firebase emulators:start --only auth,functions,firestore`.
- Las pruebas de integración backend y el seed (US6.1) corren **contra emuladores**, nunca contra producción.
- El frontend E2E apunta al servidor Next (`npm run build && npm start`) conectado a los emuladores (`FIRESTORE_EMULATOR_HOST` etc. en `.env.local`).

#### Mocks de Resend (US3.2)
- El envío de correo pasa por un puerto `EmailSender` (mismo patrón que `Translator` e `ImageProcessor`).
- En tests: **falso capturador** que registra asunto/destinatario/HTML en memoria → aserciones sobre el contenido sin red ni API key.
- En desarrollo local: variable de entorno `EMAIL_MODE=mock` (o clave de Resend de prueba); **nunca** credenciales reales en el repo (T2).

#### Imágenes sintéticas para Storage/R2 (US1.9, US6.1, US4.2)
- Generar **SVG local o Data URI** con dimensiones conocidas (≥ 800 px de lado mayor) para fixtures válidas.
- Fixture JPEG/PNG/WebP real mínima por tipo para tests de validación por contenido (no por extensión, AC1.9.3).
- Sin descargas de internet y sin fotos de personas reales (AC6.1.4, T2). Los assets del seed se generan localmente.

#### Mock Translator (AC0.5.9)
- Puerto `Translator` en dominio/aplicación; el proveedor (Google Cloud Translation) vive solo en infraestructura.
- Selección por variable de entorno: `TRANSLATOR_PROVIDER=mock` (dev, tests y seed) → traducción falsa determinista, **sin credenciales ni costo**.
- Los tests de casos de uso usan siempre el traductor falso (AC0.5.8); ningún test unitario llama al proveedor real.

### 1.3 Estado actual del harness (inventario honesto)

| Herramienta | Estado | Dónde se resuelve |
|---|---|---|
| ESLint 9 flat config (client y functions) | ✅ `npm run lint` → exit 0 (functions migrado desde v8; sin `eslint-config-google`) | hoy |
| Prettier (`format` / `format:check`) | ✅ instalado en la raíz; `docs/` y artefactos generados vía `.prettierignore` | hoy |
| Vitest + cobertura (ambos paquetes) | ✅ `npm run test` → exit 0 (`passWithNoTests`); `test:coverage` por workspace → exit 0 | hoy |
| Playwright (móvil por defecto 375 × 667) | ✅ config + spec placeholder en `packages/client/e2e/` (no forma parte de gates) | hoy |
| `@axe-core/playwright` | ✅ instalado en `@jf/client` | hoy (specs a escribir en cada MT) |
| `@lhci/cli` | ✅ instalado en la raíz; falta `lighthouserc.json` | MT0.4 (gate en MT6.2) |
| CI (GitHub Actions) | ❌ sin `.github/workflows` | MT0.2 |
| Emuladores (config) | ✅ `firebase.json` | script `npm run emulators` pendiente |
| Tipos de contrato (`*.gen.d.ts`) | ✅ `npm run build:types -w @jf/shared-types` idempotente | hoy |

---

## 2. Backend QA (`packages/functions`)

### 2.1 Comandos (hoy: scripts reales del workspace)

```bash
# Unitarios + integración (Vitest, contra emuladores cuando aplique)
npm run test -w @jf/functions            # = vitest run

# Cobertura (gate: ≥ 80 % en lógica de dominio, DoD §2.3)
npm run test:coverage -w @jf/functions   # = vitest run --coverage

# Tipos estrictos (0 errores)
npm run typecheck -w @jf/functions       # = tsc --noEmit

# Lint
npm run lint -w @jf/functions
```

> Nota: todos los scripts existen y corren hoy con exit 0 (verificado desde la raíz y con `-w @jf/functions`). La cobertura ≥ 80 % aplica a **`packages/functions`** (DoD §2.3); `shared-types` es un paquete de solo tipos `.d.ts` y queda fuera del umbral.

### 2.2 Reglas de calidad de código backend

- **TypeScript `strict`** + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` (`.opencoderules`).
- **0** `any`, **0** `@ts-ignore` / `@ts-expect-error`, **0** `as any`. Verificación automatizable:
  ```bash
  grep -rnE '(@ts-ignore|@ts-expect-error|\bas any\b)' packages/functions/src && echo FAIL || echo PASS
  ```
- **Puertos** (`Translator`, `ImageProcessor`, `EmailSender`) en dominio/aplicación; ningún módulo fuera de infraestructura importa `sharp`, `resend` ni el SDK de traducción (AC0.5.8, AC1.9.17/20); verificable con grep de imports:
  ```bash
  grep -rn "from 'sharp'\|from \"sharp\"" packages/functions/src --include='*.ts' | grep -v infrastructure/ && echo FAIL || echo PASS
  ```
- **Errores** solo del catálogo de `shared-types` (`VALIDATION_ERROR` 422, etc.; AC0.1.3); nunca códigos crudos de infraestructura en respuestas (AC0.1.5).
- **Sin secretos ni PII en logs** (T2, AC1.1.7, AC3.2.7): grep de tokens/secretos en código y snapshots de logs.

### 2.3 Qué se prueba (mapa mínimo AC → suite)

| Suite | Cubre | Tipo |
|---|---|---|
| `domain/` | invariantes: precio COP entero >0, estados, código JF-XXXX, reglas Translatable | unitario puro |
| `application/` | casos de uso con dobles falsos (`ImageProcessor`, `Translator`, `EmailSender`, repositorios) | unitario |
| `presentation/` | mapeo de errores al catálogo, validación 422, `X-Internal-Key` 401, `X-User-Role` 403 | unitario/integración |
| integración (emuladores) | CRUD + consulta pública con índices, cursor `{createdAt,id}` (AC1.10.2), rate-limit (US3.4), tarea «Nuevo» idempotente (AC1.11.3) | integración |
| contrato | requests contra `openapi.backend.yaml` y `openapi.bff.yaml` (tipos generados en `@jf/shared-types`) | integración |

---

## 3. Frontend QA (`packages/client`)

### 3.1 Comandos (hoy: scripts reales del workspace)

```bash
# Unitarios/integración de utilidades (cliente HTTP, filters, i18n, helpers)
npm run test -w @jf/client

# E2E con Playwright: proyecto MÓVIL por defecto 375 × 667 (AC7.6.1)
npm run test:e2e -w @jf/client            # = playwright test (proyecto móvil por defecto)
npm run test:e2e -w @jf/client -- --project=desktop-chromium   # escritorio, solo smoke (AC7.6.2)

# Auditoría de accesibilidad integrada en E2E (@axe-core/playwright)
# → 0 violaciones críticas; violaciones graves (WCAG 2.1 AA) también bloquean (DoD §2.7, §6)

# Tipos + lint + build (hoy)
npm run typecheck -w @jf/client            # tsc --noEmit → exit 0
npm run lint -w @jf/client                 # ESLint 9 flat → exit 0
npm run build -w @jf/client                # next build (incluye chequeo de tipos) → exit 0
```

### 3.2 Harness E2E

- **Dispositivo por defecto:** móvil 375 × 667 con `hasTouch` y throttling equivalente a 4G regular; **toda** la suite corre ahí (AC7.6.1). Segundo proyecto de escritorio solo para smoke (AC7.6.2).
- **Datos:** seed (US6.1) idempotente contra emuladores; fixtures de imágenes sintéticas (§1.2); traductor mock; Resend mock.
- **axe:** en cada spec E2E de página pública y panel, corre `@axe-core/playwright` sobre el documento completo → **0 `critical`/`serious`**; falla la suite si aparece una violación.
- **Prohibido** medir rendimiento en dev-server: Lighthouse siempre sobre `npm run build && npm start` con perfil móvil (`PERFORMANCE.md` §1 y §9).

### 3.3 Qué cubre el E2E (flujos críticos por MT)

| Flujo | Origen |
|---|---|
| Login Google → `/admin` → denied para no-listado | US1.1/US1.5 |
| CRUD inmueble: crear `HIDDEN` → completar → `ACTIVE` → aparece en listado público sin rebuild | US1.7/US4.1/AC0.3.2 |
| Subida de fotos: presign → confirm → derivados → reordenar/portada | US1.8/US1.9/US4.2 |
| Listado: filtros DB en URL, filtros frontend sin red, scroll infinito sin duplicados | US2.2/US2.3 |
| Consignación: validación, consentimiento, EMAIL_DELIVERY_FAILED → respaldo WhatsApp | US3.1/US3.3 |
| i18n: paridad `es`/`en`, `noindex` sin traducción, cambio de idioma conservando slug | US0.4 |
| Mobile: 0 desplazamiento horizontal a 320/375/414 px; targets ≥ 44 px | US7.1 |

---

## 4. Protocolo de verificación [agente] vs [manual]

### 4.1 Criterios `[agente]`: la IA valida sus propios cambios antes de reportar

Todo AC marcado `[agente]` en `TASKS.md` debe quedar demostrado con uno de estos métodos, citando el comando y su salida:

1. **Tests automatizados:** `npm run test -w <paquete>` (y `:coverage` cuando toque cobertura) → exit 0; citar el test nuevo que cubre el AC.
2. **curl / llamada HTTP** contra emuladores o dev server para endpoints BFF/backend:
   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:5001/api/v1/... \
     -H 'X-Internal-Key: test' ...     # esperado: 200/401/422 según el AC
   ```
   Con `grep` sobre la respuesta para códigos de error del catálogo (`VALIDATION_ERROR`, `PERMISSION_DENIED`…).
3. **Comandos de CLI con grep** (verificaciones binarias de texto):
   ```bash
   # T1: ningún texto visible hardcodeado en JSX
   # T3: todo link de WhatsApp pasa por buildWhatsAppUrl
   grep -rn "web.whatsapp.com\|api.whatsapp.com" packages/client/src --include='*.tsx' | grep -v buildWhatsAppUrl && echo FAIL || echo PASS
   # T2: sin secretos/datos reales
   grep -rnE "(api[_-]?key|secret|password)\s*[:=]\s*['\"][A-Za-z0-9]" --exclude-dir=node_modules . && echo FAIL || echo PASS
   # AC2.5.5: número de WhatsApp no literal
   grep -rn "302[ -]?467" packages --exclude-dir=node_modules && echo FAIL || echo PASS
   ```
4. **Playwright/E2E** para cualquier AC de UI visible (`npm run test:e2e`).
5. **Chequeo de tipos/lint:** `npm run typecheck` + `npm run lint` del paquete afectado → 0 errores.

**Reglas del agente:**
- Reportar «Listo» solo con la evidencia: comando + resultado (exit 0 / salida esperada).
- Un AC `[agente]` sin prueba o comando que lo demuestre = **no hecho**.
- Los `\[Debe NOT\]` se verifican igual (grep/evaluación negativa), no solo la vía feliz.

### 4.2 Criterios `[manual]`: checklist de inspección humana

Marcar con **quién** y **cuándo** (exige DoD §2.1):

- [ ] **Drag-and-drop de fotos** en el editor: reordenar con mouse y con botones «mover antes/después» en táctil (AC4.2.3/AC4.2.5); portada correcta tras recargar.
- [ ] **Visor Pannellum 360°**: carga solo al pulsar «Ver en 360°»; 3 panorámicas como máximo; comportamiento en móvil real.
- [ ] **Upload en red lenta/móvil real**: 2 en paralelo, barra de progreso, reintento por foto sin bloquear el formulario (AC7.5.3/4).
- [ ] **Credenciales/dominio Resend**: remitente con SPF/DKIM válidos (AC3.2.6).
- [ ] **Alerta de presupuesto** de Firebase creada (AC6.2.1).
- [ ] **Revisión jurídica** de páginas legales y retiro del aviso de «borrador» (AC5.3.4).
- [ ] **Dispositivo Android real** de gama media: listado con filtros, ficha, consignación, carga de foto en panel (AC7.6.6).
- [ ] **DNS/Dominio y despliegue a producción** solo con visto explícito del propietario (AC6.3.7).
- [ ] **Contenido real del cliente** (fotos, textos de Nosotros, cifras verificables) cargado y revisado.

---

## 5. Gates de integración continua (CI)

### 5.1 Orden exacto de validación pre-PR (falla en el primer gate rojo)

Ejecutar desde la raíz, en este orden:

```bash
# 1. Lint (todos los workspaces)
npm run lint
# 2. Formato (Prettier, --check; no muta)
npm run format:check
# 3. Tipos (strict, 0 errores, sin any)
npm run typecheck
# 4. Tests (unit + integración)
npm run test
# 5. Cobertura (backend ≥ 80 %; por workspace, no hay script en la raíz)
npm run test:coverage -w @jf/functions
# 6. Build (functions tsc + client next build)
npm run build
# 7. E2E móvil (Playwright + axe)        [desde MT0.4]
npm run test:e2e
```

Los gates de **rendimiento** (Lighthouse móvil `@lhci/cli` y presupuesto de bundles) se activan en **MT6.2** con los valores de `PERFORMANCE.md` §2/§3 y fallan la build si se incumplen (AC7.2.8, AC7.6.3). Mientras tanto son informativos.

### 5.2 Resumen de umbrales (fuente: DoD §6 + PERFORMANCE.md)

| Gate | Herramienta | Umbral |
|---|---|---|
| Build | tsc / next build | 0 errores |
| Lint / format | ESLint 9 + Prettier | 0 errores / 0 diffs |
| Tipos | TS strict (+ `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) | sin `any` ni ignores |
| Tests | Vitest | todos en verde; sin `.skip` injustificados |
| Cobertura | Vitest + v8 | **≥ 80 %** en `packages/functions` |
| E2E | Playwright (móvil 375×667) | flujos críticos por MT en verde |
| Accesibilidad | `@axe-core/playwright` | 0 violaciones críticas/serias (WCAG 2.1 AA) |
| Contrato | validación OpenAPI (specs backend + bff × shared-types) | coherentes |
| Seguridad | grep de secretos + revisión BFF/backend | sin secretos; identidad/autorización en backend |
| i18n | paridad es/en + grep JSX | sin texto hardcodeado (T1) |
| Rendimiento | `@lhci/cli` (MT6.2) | ≥ 85 · LCP ≤ 2,5 s · CLS ≤ 0,1 · TBT ≤ 300 ms |
| Bundles | script MT0.4 (MT6.2) | JS inicial ≤ 200 KB · página ≤ 1 MB · ficha ≤ 1,5 MB |

### 5.3 Ramas (referencia: DoD §5)

`feat/usX.y` → PR a `dev` (CI verde, auto-merge permitido) → `dev` → `main` (release: CI verde **y** aprobación humana). Commit estilo Conventional Commits con referencia a la US.

---

**Documentos relacionados:** `./TASKS.md` (AC) · `./DEFINITION-OF-DONE.md` (reglas) · `./PERFORMANCE.md` (números) · `./ARCHITECTURE.md` (estructura y tabla de índices §5).
