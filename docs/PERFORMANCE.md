# docs/PERFORMANCE.md
# Presupuestos de Rendimiento y de Datos (Mobile First)

**Proyecto:** Plataforma Web & CMS `jfpropiedadraiz.com`  
**Versión:** 1.1 · 22 de octubre de 2026  
**Base:** `./TASKS.md` — Épica 7 (US7.2, US7.3, US7.6), US1.9 (derivados), US2.3 (scroll infinito), US1.10 (consulta pública)  
**Naturaleza:** este documento es la **fuente única de los valores numéricos de rendimiento**. Las historias citan el presupuesto aquí definido; si un valor cambia, se cambia sólo aquí (ver §10).

---

## 1. Perfil de medición (obligatorio)

Todo presupuesto de este documento se mide **siempre** en el mismo perfil, nunca en el escritorio de desarrollo:

| Parámetro | Valor |
| :---- | :---- |
| Dispositivo | móvil emulado (Lighthouse «Mobile», 375 × 667) |
| Red | 4G regular (throttling simulado de Lighthouse) |
| CPU | 4× más lenta que el equipo de desarrollo |
| Herramienta oficial | Lighthouse (perfil móvil por defecto) y `@lhci/cli` en CI |
| Alcance | rutas públicas de US0.4 (listado en §2) y panel `/admin` (sin presupuesto de Lighthouse; presupuesto de bytes por definir, ver §3) |

Medir con el perfil de escritorio **invalida** el resultado y no cuenta como verificación (US7.6, AC7.6.4).

---

## 2. Presupuesto de métricas (Lighthouse móvil)

Aplica a **todas** las rutas públicas de US0.4: `/es`, `/es/venta`, `/es/alquiler`, `/es/proyectos`, `/es/propiedad/[slug]`, `/es/servicios`, `/es/servicios/[slug]`, `/es/nosotros`, `/es/consigne-su-propiedad`, `/es/contacto` y las legales (`/es/aviso-de-privacidad`, `/es/politica-de-tratamiento-de-datos`, `/es/terminos`), más sus equivalentes `/en/...`. La ficha se mide sobre un `slug` de los datos de ejemplo (US6.1).

| Métrica | Umbral | Referencia |
| :---- | :---- | :---- |
| Puntuación Lighthouse (Performance) | **≥ 85** | AC7.2.1 (y AC2.4.10 para la ficha) |
| LCP (Largest Contentful Paint) | **≤ 2,5 s** | AC7.2.1 |
| CLS (Cumulative Layout Shift) | **≤ 0,1** | AC7.2.1 |
| TBT (Total Blocking Time) | **≤ 300 ms** | AC7.2.1 |

Cumplimiento en CI: obligatorio en **todas** las rutas públicas de §2. El gate se activa en **MT6.2** (ver §8); hasta entonces las mediciones son referencia y no bloquean.

---

## 3. Presupuesto de bytes

| Medida | Umbral | Referencia |
| :---- | :---- | :---- |
| JS hidratado de la primera carga de un listado (`/venta`, `/alquiler`, `/proyectos`) | **≤ 200 KB** comprimido | AC7.2.2 |
| Total de una página de listado (HTML + CSS + JS + fuentes) | **≤ 1 MB** comprimido | AC7.2.2 |
| Total de una ficha hasta ser interactiva (sin video/360° que el usuario dispare) | **≤ 1,5 MB** comprimido | AC7.2.3 |
| JSON de una página de 12 tarjetas (respuesta del listado) | **≤ 30 KB** sin comprimir | AC7.4.2 |
| Bundle de idioma servido | solo el idioma de la ruta (nunca ambos) | AC7.2.4 |
| Peticiones al servidor propio en una visita normal | **≤ 6** (además de imágenes) | AC7.2.7 |

> El panel `/admin` no tiene presupuesto Lighthouse (no es una superficie pública indexable); su presupuesto de bytes queda **por definir** y no forma parte de los gates de CI de §8.

Componentes del bundle público que **no** deben aparecer en la carga inicial: código de `/admin`, el SDK de Firebase en el cliente donde no aplique, Pannellum (se carga al abrir el visor 360°, AC2.4.7) y paquetes de íconos completos (importación uno a uno) — AC7.2.6.

---

## 4. Fuentes

- Solo mediante `next/font` (autohospedadas, sin peticiones a Google Fonts).
- Subconjunto **latino** únicamente.
- Máximo **2 familias** y el mínimo de pesos necesarios; `font-display: swap`.
- Referencia: AC7.2.5.

---

## 5. Imágenes y multimedia

### 5.1 Derivados disponibles (US1.9)

Los derivados se generan **solo en el backend** (AC1.9.21); el navegador nunca los produce. Anchos: **320, 640, 1280 y 2048 px**. Las claves de los derivados cambian cuando la imagen cambia (AC1.9.1) y **no conservan metadatos EXIF** (AC1.9.11).

| Contexto | Ancho máximo servido | Referencia |
| :---- | :---- | :---- |
| Tarjeta de listado (contenedor ≤ 375 px) | 640 | AC7.3.2 (coherente con AC2.2.11) |
| Galería de ficha en móvil | 1280 | AC7.3.3 |
| Visor modal de escritorio / pantalla que lo exija | 2048 | AC7.3.3 (ajusta AC2.4.5) |
| Foto de equipo y obras en «Nosotros»/Servicios | 640 | AC5.6.1 |

### 5.2 Calidad y peso

| Parámetro | Valor inicial | Referencia |
| :---- | :---- | :---- |
| Calidad de compresión de los derivados | **75–80** (JPEG/WebP) | AC7.3.9 |
| Peso promedio del derivado 640 usado en tarjetas | **≤ 60 KB** | AC7.3.9 |

### 5.3 Reglas de carga

- `srcset` con los cuatro derivados y `sizes` acorde al contenedor (AC7.3.1).
- `width`/`height` o `aspect-ratio` siempre declarados → CLS 0 en imágenes (AC7.3.5, AC2.2.8).
- Solo la imagen principal de la portada usa `priority`; el resto `loading="lazy"` y `decoding="async"` (AC7.3.4).
- Galería de ficha: primera foto y miniaturas visibles; el resto al deslizar (AC7.3.6).
- Video (AC2.4.6) y 360° (AC2.4.7): **nada** se descarga hasta que el usuario los activa (AC7.3.7).
- `Save-Data` activo → derivado inmediatamente menor y sin precarga fuera de viewport (AC7.3.8).
- Prohibido `/_next/image`; `next/image` solo con loader propio a R2 o `images.unoptimized`; sin GIF animados ni video de fondo en portada (AC7.3.10).

### 5.4 Pre-reducción en el navegador antes de subir (panel)

Antes de la subida (AC4.2.9 / US7.5.1): el navegador reduce el lado mayor a **≤ 2048 px** (sin ampliar nunca), recomprime, aplica la orientación visual EXIF y **descarta los metadatos**; nunca baja el lado mayor de **800 px** y la panorámica conserva 2:1 con lado mayor **≤ 4096 px** (US7.5.2).

---

## 6. API, caché y red

| Regla | Valor | Referencia |
| :---- | :---- | :---- |
| Tipo devuelto por el listado | `PropertyCard` (sin `descripcion`, `puntosInteres` ni lista completa de fotos) | AC7.4.1 |
| Compresión de HTML/JSON/CSS/JS | Brotli (gzip como mínimo) | AC7.4.3 |
| Assets con hash | `Cache-Control: public, max-age=31536000, immutable` | AC7.4.4 |
| Caché de derivados en R2 | larga, con clave que cambia si la imagen cambia | AC7.4.4 (AC1.9.1) |
| Página pública revalidada (ISR/CDN) | una visita normal no ejecuta Functions | AC7.4.5 (US0.3) |
| `staleTime` de TanStack Query (listados) | **≥ 60 s** | AC7.4.6 |
| `refetchOnWindowFocus` | `false` | AC7.4.6 |
| Prefetch de enlaces | desactivado (`prefetch={false}`); solo al presionar / hover con puntero fino | AC7.4.7 |
| Scroll infinito | 12 por carga, disparador cerca del final, nunca dos páginas a la vez | AC7.4.8 (D19, US2.3) |
| Debounce de campos con sugerencias/autocompletado | **300 ms** + cancelación de la petición anterior | AC7.4.9 |
| Timeout de petición al servidor propio | **15 s** → mensaje en español + reintento, sin bloquear la página | AC7.4.10 (US5.4) |

---

## 7. Scripts de terceros

Ninguno antes de una interacción explícita del usuario: no hay Google Analytics, tag managers ni embeds en la carga inicial (AC7.2.9). Tampoco peticiones a recursos de terceros en una visita normal (AC7.2.7).

---

## 8. Gates de CI (MT6.2)

| Gate | Herramienta | Falla la build si… | Referencia |
| :---- | :---- | :---- | :---- |
| Rendimiento móvil | `@lhci/cli` con `lighthouserc.json` (perfil de §1) | alguna ruta supera los umbrales de §2 | AC7.2.8, AC7.6.3 |
| Presupuesto de bundles | script de análisis de bundles (MT0.4) | se superan los límites de §3 | AC7.2.8, AC7.6.3 |
| E2E móvil | Playwright, proyecto táctil 375 × 667 por defecto | cualquier e2e del proyecto móvil falla | AC7.6.1, AC7.6.3 |

La configuración (`lighthouserc.json`, proyecto Playwright móvil, script de bundles) se monta en **MT0.4**; los gates se activan en **MT6.2** para todas las rutas de AC7.2.1. El `lighthouserc.json` actual solo mide `/es` y `/en`; MT6.2 lo amplía a listado, ficha, servicios, Nosotros, contacto y legales.

---

## 9. Cómo verificar en local

1. **Levantar el sitio** con los datos de ejemplo (`US6.1`) en emuladores y servir un build de producción (`npm run build && npm start` en `packages/client`): los presupuestos no se pueden validar en modo desarrollo.
2. **Lighthouse móvil** sobre cada ruta de §2:
   `npx lighthouse <url> --form-factor=mobile --throttling-method=simulate --output=html --output-path=./reports/lh-<ruta>.html --chrome-flags="--headless"`
   (el perfil por defecto de Lighthouse es móvil, 4G simulado y CPU 4× más lenta).
3. **Bundles:** ejecutar el script de análisis de bundles definido en MT0.4 y comparar con §3.
4. **Red real:** activar el perfil «Slow 4G» y CPU 4× en las DevTools del navegador para una comprobación manual rápida en las rutas clave (listado, ficha, consigne).
5. **Móvil real:** comprobar el flujo en un Android de gama media (US7.6.6) antes de cerrar una release.

---

## 10. Calibración

- **Decisión:** los valores de este documento son **iniciales** y se calibran con la **primera medición real** (perfil de §1) y se ajustan aquí (AC7.2.5, AC7.3.9).
- Un cambio de presupuesto se hace **solo en este documento**; las historias lo referencian, no lo copian.
- Si un umbral debe relajarse temporalmente, se registra como pendiente con motivo y fecha, no se elimina la referencia.

---

## 11. Referencias

- Historias y AC: `./TASKS.md` — Épica 7 (US7.1–US7.6), US1.9, US1.10, US2.3, US2.4, US4.2, US5.4, US6.1.
- Definición de Done: `./DEFINITION-OF-DONE.md` §2.10, §4 y §6.
- Plan de desarrollo: `./DEVELOPMENT-PLAN.md` — MT0.4 (configuración) y MT6.2 (gates).
- Estructura y convenciones del monorepo: `./ARCHITECTURE.md`.
