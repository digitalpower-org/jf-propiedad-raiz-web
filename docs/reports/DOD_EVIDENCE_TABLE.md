# Definition of Done — Evidence Table (Ola 2: MT2.3, MT2.4, MT3.2)

> Generado automáticamente: 2026-11-09T21:12:44.471Z
> Git: cfb2607

> **Notas cualitativas:** Ver `docs/reports/DOD_NOTES.md` (escrito a mano)

---

## 1. AC Coverage (MT2.3 US2.1-2.7 + MT3.2 US5.3 + US7.1, US7.3, US7.4 cliente)

*Fuente: `scripts/check-ac-coverage.mjs` con resultados reales de vitest + playwright*

| AC ID | US | MT | Estado | Test / Evidencia |
|-------|----|----|--------|------------------|
| AC ID | US | MT | Estado | Test Encontrado |
| AC2.1.1 | US2.1 | MT2.3 | ✅ PASS | us21-ac.spec.ts: AC2.1.1 | Menú principal - enlaces existen en DOM en mobile (CSS display:none) |
| AC2.1.2 | US2.1 | MT2.3 | ✅ PASS | us21-ac.spec.ts: AC2.1.2 | Cambio de pestaña resetea filtros y parámetros |
| AC2.1.3 | US2.1 | MT2.3 | ⏭️ SKIP | us21-ac.spec.ts: AC2.1.3 | Inmueble aparece solo en pestaña de su operación (requiere seed MT2.4) |
| AC2.1.4 | US2.1 | MT2.3 | ❌ SIN TEST | — |
| AC2.1.5 | US2.1 | MT2.3 | ❌ SIN TEST | — |
| AC2.1.6 | US2.1 | MT2.3 | ❌ SIN TEST | — |
| AC2.1.7 | US2.1 | MT2.3 | ❌ SIN TEST | — |
| AC2.1.8 | US2.1 | MT2.3 | ❌ SIN TEST | — |
| AC2.1.9 | US2.1 | MT2.3 | ❌ SIN TEST | — |
| AC2.2.1 | US2.2 | MT2.3 | ❌ SIN TEST | — |
| AC2.2.2 | US2.2 | MT2.3 | ❌ SIN TEST | — |
| AC2.2.3 | US2.2 | MT2.3 | ❌ SIN TEST | — |
| AC2.2.4 | US2.2 | MT2.3 | ❌ SIN TEST | — |
| AC2.2.5 | US2.2 | MT2.3 | ❌ SIN TEST | — |
| AC2.2.6 | US2.2 | MT2.3 | ❌ SIN TEST | — |
| AC2.2.7 | US2.2 | MT2.3 | ❌ SIN TEST | — |
| AC2.2.8 | US2.2 | MT2.3 | ❌ SIN TEST | — |
| AC2.2.9 | US2.2 | MT2.3 | ❌ SIN TEST | — |
| AC2.2.10 | US2.2 | MT2.3 | ❌ SIN TEST | — |
| AC2.2.11 | US2.2 | MT2.3 | ❌ SIN TEST | — |
| AC2.2.12 | US2.2 | MT2.3 | ❌ SIN TEST | — |
| AC2.3.1 | US2.3 | MT2.3 | ❌ SIN TEST | — |
| AC2.3.2 | US2.3 | MT2.3 | ❌ SIN TEST | — |
| AC2.3.3 | US2.3 | MT2.3 | ❌ SIN TEST | — |
| AC2.3.4 | US2.3 | MT2.3 | ❌ SIN TEST | — |
| AC2.3.5 | US2.3 | MT2.3 | ❌ SIN TEST | — |
| AC2.3.6 | US2.3 | MT2.3 | ❌ SIN TEST | — |
| AC2.3.7 | US2.3 | MT2.3 | ❌ SIN TEST | — |
| AC2.4.1 | US2.4 | MT2.3 | ❌ SIN TEST | — |
| AC2.4.2 | US2.4 | MT2.3 | ❌ SIN TEST | — |
| AC2.4.3 | US2.4 | MT2.3 | ❌ SIN TEST | — |
| AC2.4.4 | US2.4 | MT2.3 | ❌ SIN TEST | — |
| AC2.4.5 | US2.4 | MT2.3 | ❌ SIN TEST | — |
| AC2.4.6 | US2.4 | MT2.3 | ❌ SIN TEST | — |
| AC2.4.7 | US2.4 | MT2.3 | ❌ SIN TEST | — |
| AC2.4.8 | US2.4 | MT2.3 | ❌ SIN TEST | — |
| AC2.4.9 | US2.4 | MT2.3 | ❌ SIN TEST | — |
| AC2.4.10 | US2.4 | MT2.3 | ❌ SIN TEST | — |
| AC2.5.1 | US2.5 | MT2.3 | ✅ PASS | src/lib/whatsapp.test.ts: buildWhatsAppUrl > AC2.5.1 | móvil: construye URL wa.me con número y mensaje codificado |
| AC2.5.2 | US2.5 | MT2.3 | ✅ PASS | src/lib/whatsapp.test.ts: buildWhatsAppUrl > AC2.5.2 | móvil: codifica caracteres especiales del mensaje |
| AC2.5.3 | US2.5 | MT2.3 | ✅ PASS | src/lib/whatsapp.test.ts: normalizePhoneNumber > AC2.5.3 | normaliza número colombiano 10 dígitos empezando en 3 |
| AC2.5.4 | US2.5 | MT2.3 | ✅ PASS | src/lib/whatsapp.test.ts: buildWhatsAppUrl > AC2.5.4 | helper es función pura: misma entrada produce misma salida |
| AC2.6.1 | US2.6 | MT2.3 | ❌ SIN TEST | — |
| AC2.6.2 | US2.6 | MT2.3 | ❌ SIN TEST | — |
| AC2.6.3 | US2.6 | MT2.3 | ❌ SIN TEST | — |
| AC2.6.4 | US2.6 | MT2.3 | ❌ SIN TEST | — |
| AC2.6.5 | US2.6 | MT2.3 | ❌ SIN TEST | — |
| AC2.6.6 | US2.6 | MT2.3 | ❌ SIN TEST | — |
| AC2.7.1 | US2.7 | MT2.3 | ❌ SIN TEST | — |
| AC2.7.2 | US2.7 | MT2.3 | ❌ SIN TEST | — |
| AC2.7.3 | US2.7 | MT2.3 | ❌ SIN TEST | — |
| AC2.7.4 | US2.7 | MT2.3 | ❌ SIN TEST | — |
| AC2.7.5 | US2.7 | MT2.3 | ❌ SIN TEST | — |
| AC2.7.6 | US2.7 | MT2.3 | ❌ SIN TEST | — |
| AC5.3.1 | US5.3 | MT3.2 | ❌ SIN TEST | — |
| AC5.3.2 | US5.3 | MT3.2 | ❌ SIN TEST | — |
| AC5.3.3 | US5.3 | MT3.2 | ❌ SIN TEST | — |
| AC7.1.1 | US7.1 | MT3.2 | ❌ SIN TEST | — |
| AC7.1.2 | US7.1 | MT3.2 | ❌ SIN TEST | — |
| AC7.1.3 | US7.1 | MT3.2 | ❌ SIN TEST | — |
| AC7.1.4 | US7.1 | MT3.2 | ❌ SIN TEST | — |
| AC7.1.5 | US7.1 | MT3.2 | ❌ SIN TEST | — |
| AC7.1.6 | US7.1 | MT3.2 | ❌ SIN TEST | — |
| AC7.1.7 | US7.1 | MT3.2 | ❌ SIN TEST | — |
| AC7.1.8 | US7.1 | MT3.2 | ❌ SIN TEST | — |
| AC7.3.1 | US7.3 | MT3.2 | ❌ SIN TEST | — |
| AC7.3.2 | US7.3 | MT3.2 | ❌ SIN TEST | — |
| AC7.3.3 | US7.3 | MT3.2 | ❌ SIN TEST | — |
| AC7.3.4 | US7.3 | MT3.2 | ❌ SIN TEST | — |
| AC7.3.5 | US7.3 | MT3.2 | ❌ SIN TEST | — |
| AC7.3.6 | US7.3 | MT3.2 | ❌ SIN TEST | — |
| AC7.3.7 | US7.3 | MT3.2 | ❌ SIN TEST | — |
| AC7.3.8 | US7.3 | MT3.2 | ❌ SIN TEST | — |
| AC7.3.9 | US7.3 | MT3.2 | ❌ SIN TEST | — |
| AC7.4.1 | US7.4 | MT3.2 | ❌ SIN TEST | — |
| AC7.4.2 | US7.4 | MT3.2 | ❌ SIN TEST | — |
| AC7.4.3 | US7.4 | MT3.2 | ❌ SIN TEST | — |
| AC7.4.4 | US7.4 | MT3.2 | ❌ SIN TEST | — |
| AC7.4.5 | US7.4 | MT3.2 | ❌ SIN TEST | — |
| AC7.4.6 | US7.4 | MT3.2 | ❌ SIN TEST | — |
| AC7.4.7 | US7.4 | MT3.2 | ❌ SIN TEST | — |
| AC7.4.8 | US7.4 | MT3.2 | ❌ SIN TEST | — |
| AC7.4.9 | US7.4 | MT3.2 | ❌ SIN TEST | — |
| AC7.4.10 | US7.4 | MT3.2 | ❌ SIN TEST | — |

**Resumen:** 84 ACs totales | ✅ PASS: 6 | ❌ FAIL: 0 | ⏭️ SKIP: 1 | ⚠️ PARTIAL: 0 | ❌ SIN TEST: 77 | **Cubiertos (PASS): 7.1%**

> Nota: Los tests unitarios de WhatsApp (`whatsapp.test.ts`) cubren AC2.5.1–2.5.4.

---

## 2. Lint + Typecheck + Build

| Check | Comando | Salida literal | Estado |
|-------|---------|----------------|--------|
| Lint | `npm run lint` | `0 errors, 42 warnings` | ✅ 0 errors |
| Typecheck | `npm run typecheck` | Capturado en `npm run report` | — |
| Build | `npm run build` | Capturado en `npm run report` | — |

---

## 3. Tests Unitarios (Vitest)

| Comando | Total | Pasan | Fallan | Omitidos | Evidencia |
|---------|-------|-------|--------|----------|-----------|
| `npm run test` | 183 | 183 | 0 | 0 | `docs/reports/vitest-results.json` |

### Por archivo:

| Archivo | Pasan | Fallan | Omitidos |
|---------|-------|--------|----------|
| LanguageSwitcher.test.tsx | 12 | 0 | 0 |
| PanoramaViewer.test.tsx | 11 | 0 | 0 |
| PropertyGallery.test.tsx | 7 | 0 | 0 |
| PropertyPOIs.test.tsx | 7 | 0 | 0 |
| PropertySpecs.test.tsx | 13 | 0 | 0 |
| PropertyStickySidebar.test.tsx | 9 | 0 | 0 |
| VideoFacade.test.tsx | 9 | 0 | 0 |
| messages.parity.test.ts | 3 | 0 | 0 |
| negotiate.test.ts | 5 | 0 | 0 |
| routes.test.ts | 11 | 0 | 0 |
| property.test.ts | 4 | 0 | 0 |
| whatsapp.test.ts | 26 | 0 | 0 |
| backend-url.test.ts | 6 | 0 | 0 |
| bff-delegation.test.ts | 24 | 0 | 0 |
| bff-helper.test.ts | 9 | 0 | 0 |
| health.test.ts | 11 | 0 | 0 |
| match-route.test.ts | 7 | 0 | 0 |
| routes-conformance.test.ts | 2 | 0 | 0 |
| jwt.test.ts | 7 | 0 | 0 |

---

## 4. Tests E2E (Playwright) — Entorno Limpio

| Proyecto | Total | Pasan | Fallan | Omitidos |
|----------|-------|-------|--------|----------|
| mobile-chromium | 34 | 27 | 0 | 7 |
| desktop-chromium | 34 | 27 | 0 | 7 |
| **Total** | **68** | **54** | **0** | **14** |

### Por archivo:

| Archivo | Total | Pasan | Fallan | Omitidos |
|---------|-------|-------|--------|----------|
| admin-guard.spec.ts | 2 | 2 | 0 | 0 |
| i18n.spec.ts | 52 | 40 | 0 | 12 |
| us21-ac.spec.ts | 14 | 12 | 0 | 2 |

### Detalle de fallos (0 total):

| Test | Proyecto | Error literal | Causa |
|------|----------|---------------|-------|

### Detalle de omitidos (14 total):

| Test | Proyecto | Motivo |
|------|----------|--------|
| navbar: slug cambia de /es/propiedad/casa-centro a /en/property/casa-centro | mobile-chromium | Hamburger menu no implementado / requiere seed MT2.4 |
| navbar: slug cambia de /es/propiedad/apartamento-norte a /en/property/apartamento-norte | mobile-chromium | Hamburger menu no implementado / requiere seed MT2.4 |
| navbar: slug cambia de /es/servicios/asesoria-legal a /en/services/asesoria-legal | mobile-chromium | Hamburger menu no implementado / requiere seed MT2.4 |
| footer: slug cambia de /es/propiedad/casa-centro a /en/property/casa-centro | mobile-chromium | Hamburger menu no implementado / requiere seed MT2.4 |
| footer: slug cambia de /es/propiedad/apartamento-norte a /en/property/apartamento-norte | mobile-chromium | Hamburger menu no implementado / requiere seed MT2.4 |
| footer: slug cambia de /es/servicios/asesoria-legal a /en/services/asesoria-legal | mobile-chromium | Hamburger menu no implementado / requiere seed MT2.4 |
| navbar: slug cambia de /es/propiedad/casa-centro a /en/property/casa-centro | desktop-chromium | Hamburger menu no implementado / requiere seed MT2.4 |
| navbar: slug cambia de /es/propiedad/apartamento-norte a /en/property/apartamento-norte | desktop-chromium | Hamburger menu no implementado / requiere seed MT2.4 |
| navbar: slug cambia de /es/servicios/asesoria-legal a /en/services/asesoria-legal | desktop-chromium | Hamburger menu no implementado / requiere seed MT2.4 |
| footer: slug cambia de /es/propiedad/casa-centro a /en/property/casa-centro | desktop-chromium | Hamburger menu no implementado / requiere seed MT2.4 |
| footer: slug cambia de /es/propiedad/apartamento-norte a /en/property/apartamento-norte | desktop-chromium | Hamburger menu no implementado / requiere seed MT2.4 |
| footer: slug cambia de /es/servicios/asesoria-legal a /en/services/asesoria-legal | desktop-chromium | Hamburger menu no implementado / requiere seed MT2.4 |
| AC2.1.3 \| Inmueble aparece solo en pestaña de su operación (requiere seed MT2.4) | mobile-chromium | Ver detalle |
| AC2.1.3 \| Inmueble aparece solo en pestaña de su operación (requiere seed MT2.4) | desktop-chromium | Ver detalle |

---

## 6. Accesibilidad (axe-core)

No se detectaron violaciones critical/serious en los tests ejecutados.

---

## 7. Rendimiento (Lighthouse CI + Bundles)

### Lighthouse CI

| Métrica | Página | Comando | Resultado | Estado |
|---------|--------|---------|-----------|--------|
| Lighthouse móvil | Home, Listado, Legales | `npm run lhci` | No ejecutable en este entorno (servidor inestable / Chrome no disponible) | ⚠️ No ejecutable |

### Bundle Analysis (analyze:bundle)

Solo salida literal de `npm run analyze:bundle`. Sin filas inventadas.

``
> jf-propiedad-raiz-web@1.0.0 analyze:bundle
> node scripts/analyze-bundle.mjs

Ruta  JS (gzip)  CSS (gzip)  Archivos       Presupuesto JS  Estado
----  ---------  ----------  -------------  --------------  ------
/es   272.4 KB   40.6 KB     13 js / 4 css  ≤ 200 KB        EXCEDE
/en   272.4 KB   40.6 KB     13 js / 4 css  ≤ 200 KB        EXCEDE

AVISO: presupuesto de JS inicial superado (200 KB gzip, PERFORMANCE.md §3). Informativo hasta MT6.2.
```

> El presupuesto de JS inicial se excede (200 KB gzip, PERFORMANCE.md §3) — **FAIL** (informativo hasta MT6.2).

---

---

> **Fin del informe generado automáticamente.**
> Fuente: `scripts/generate-dod-report.mjs` | Datos: vitest/playwright/eslint/bundle/ac-coverage JSON
