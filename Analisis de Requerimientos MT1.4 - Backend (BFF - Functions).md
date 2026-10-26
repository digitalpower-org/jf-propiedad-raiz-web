## Análisis de Requerimientos MT1.4 — Backend (BFF + Functions)

### 1. Estado actual del proyecto

| MT    | Estado        | Ámbito                                                          |
| ----- | ------------- | --------------------------------------------------------------- |
| MT1.1 | ✅ Completado | BFF estructural (route handlers, proxy, helpers)                |
| MT1.2 | ✅ Completado | Autenticación end-to-end (session JWT, logout, me, seed admins) |
| MT1.4 | ⏳ Pendiente  | **Revalidación + Traducción**                                   |

El único placeholder pendiente en el BFF es `POST /api/revalidate` (retorna 501 `PENDING`). El backend (`packages/functions`) tiene solo el _walking skeleton_ (health endpoint). No existe aún el puerto `Translator`, ni la lógica de traducción, ni el flujo de revalidación.

---

### 2. Alcance de MT1.4 (según `DEVELOPMENT-PLAN.md` y `TASKS.md`)

**MT1.4 = "Revalidación y traducción"** — dos historias:

#### US0.3 — Revalidación bajo demanda (MUST, Fullstack)

- Tras cada escritura (create/edit/activate/hide/delete de Property/Service, guardar About, o tarea de bandera "Nuevo"), el backend invoca `POST /api/revalidate` con secreto.
- El BFF ejecuta `revalidatePath`/`revalidateTag` de las rutas afectadas **en ambos idiomas** (listados, ficha, portada, servicios, nosotros, sitemap).
- Orden por escritura: **validate → translate → write → revalidate**.
- Sin secreto → 401. Si falla la revalidación, la escritura ya hecha no se revierte (se registra el fallo).

#### US0.5 — Traducción ES→EN selectiva por campo (SHOULD, Dev 1)

- Puerto `Translator` (mismo enfoque que `ImageProcessor`): **Google Cloud Translation** en producción, **traductor falso** en dev/pruebas/seed (AC0.5.9).
- Solo traduce campos con `autoTranslate` activo (activado por defecto), cuando el `es` cambió o el `en` está vacío.
- Una única llamada por lote por escritura.
- Control de costo: no re-traducir si `es` no cambió y `en` ya existe.
- Si la traducción falla o tarda > 10 s: el guardado en español se completa igualmente, los campos afectados quedan "Pendiente" con `en` vacío, respuesta indica `traduccionPendiente: true`.
- El admin puede editar el `en` manualmente; ese valor se persiste tal cual.
- `autoTranslate` y `enPendiente` solo los escribe el backend (el admin no los envía en el DTO).

---

### 3. Arquitectura técnica (lo que se debe construir)

```
┌─────────────────────────────────────────────────────────────┐
│ BFF (packages/client)                                        │
│                                                              │
│  src/app/api/revalidate/route.ts  ← COMPLETAR (placeholder) │
│  src/server/                                     (helper)   │
└──────────┬──────────────────────────────────────────────┘
           │ POST /api/revalidate (X-Internal-Key)
           ▼
┌─────────────────────────────────────────────────────────────┐
│ Functions (packages/functions)                               │
│                                                              │
│  infrastructure/                                             │
│    Translator/                                               │
│      translator.ts              ← PUERTO (interface)       │
│      google-cloud-translator.ts ← Implementación real       │
│      fake-translator.ts         ← Implementación fake       │
│    revalidate-client.ts         ← Llama al BFF              │
│                                                              │
│  application/                                                 │
│    translate.ts                ← Caso de uso de traducción │
│    (integrado en Property/Service/About use cases)           │
│                                                              │
│  presentation/                                                │
│    controllers/ (existentes al crearse en MT2.x)            │
└─────────────────────────────────────────────────────────────┘
```

**Flujo de escritura (ej: crear inmueble):**

1. `POST /api/v1/properties` (BFF → Functions, con `X-User-*`)
2. Backend: valida → **traduce** (US0.5) → escribe en Firestore → **revalida** (US0.3)
3. Revalidación: Functions llama `POST /api/revalidate` (BFF) con `X-Internal-Key`
4. BFF: ejecuta `revalidatePath`/`revalidateTag` en ambos idiomas

---

### 4. Propuesta de plan de trabajo (enfocado backend)

#### Fase 1 — Puerto Translator (US0.5, base)

**Archivos nuevos:**

- `packages/functions/src/infrastructure/Translator/translator.ts` — interface `Translator` con método `translate(text: string, from: 'es', to: 'en'): Promise<string>`
- `packages/functions/src/infrastructure/Translator/google-cloud-translator.ts` — implementación real con `@google-cloud/translate`
- `packages/functions/src/infrastructure/Translator/fake-translator.ts` — implementación fake (dev/seed), elige por `TRANSLATOR_MODE=fake`

**Criterios de aceptación:**

- AC0.5.8: puerto en dominio/aplicación, proveedor en infraestructura, ningún módulo fuera de infraestructura importa el SDK del proveedor
- AC0.5.9: funciona con traductor falso por variable de entorno, sin credenciales ni costo

#### Fase 2 — Caso de uso de traducción (US0.5)

**Archivos nuevos:**

- `packages/functions/src/application/translate/translate.ts` — lógica de:
  - Detectar campos traducibles con `autoTranslate` activo
  - Solo traducir si `es` cambió o `en` está vacío (control de costo, AC0.5.2)
  - Lote único (una llamada por escritura, AC0.5.1)
  - Manejo de errores: timeout 10 s → marca `enPendiente = true`, no revierte escritura (AC0.5.5)
  - Limpieza de `enPendiente` cuando `en` se persiste (AC0.5.4)
  - Si `es` se vacía, también se vacía `en` (AC0.5.3)
  - Si el admin edita `en` manualmente, se persiste tal cual (AC0.5.12)

**Integración:** los casos de uso de Property, Service y About llaman a `translate()` antes de escribir (orden: validate → translate → write).

#### Fase 3 — Revalidación en el BFF (US0.3)

**Archivo a completar:**

- `packages/client/src/app/api/revalidate/route.ts` — reemplazar placeholder 501 por:
  - Validación de `X-Internal-Key` (mismo secreto que usa saliente hacia Functions, D32)
  - Sin secreto → 401 `UNAUTHORIZED` (AC0.3.3)
  - Con secreto → ejecutar `revalidatePath`/`revalidateTag` sobre las rutas recibidas en el body
  - Soporte para rutas en ambos idiomas (`/es/...` y `/en/...`)
  - Respuesta 200 con envoltura estándar

**Helper (opcional pero recomendado):**

- `packages/client/src/server/revalidate-helper.ts` — centraliza la construcción de rutas/tags a revalidar

#### Fase 4 — Revalidación en el backend (US0.3)

**Archivos nuevos:**

- `packages/functions/src/infrastructure/revalidate-client.ts` — cliente que llama `POST /api/revalidate` con `X-Internal-Key`
- Integración en los use cases de escritura (Property, Service, About) y en la tarea de bandera "Nuevo" (US1.11, MT2.2)

**Flujo por escritura:**

1. Use case escribe en Firestore
2. Use case llama `revalidateClient.revalidate(paths, tags)`
3. El cliente hace `fetch` al BFF con `X-Internal-Key`
4. Si falla → registra el fallo con `requestId`, **no revierte la escritura** (AC0.3.4)

#### Fase 5 — Pruebas y validación

- Tests unitarios del puerto `Translator` (fake + mock del real)
- Tests del caso de uso de traducción (control de costo, errores, estados Pendiente/Actualizada)
- Test del endpoint `POST /api/revalidate` (401 sin secreto, 200 con secreto, revalidación real)
- Test de integración: escribir inmueble → verificar que traduce y revalida
- `npm run gen:routes:check -w @jf/client` para verificar que la spec OpenAPI y el catálogo están alineados

---

### 5. Dependencias y prelaciones

```
MT1.1 (BFF estructural) ──┐
                           ├──> MT1.4 ──> MT2.1 (alta inmuebles traduce+revalida)
MT0.3 (Infra: Translation, Scheduler) ─┘      └─> MT2.2 (tarea "Nuevo" → revalidación)
                                              └─> MT4.1, MT4.2 (CMS)
```

**Bloqueos internos de MT1.4:**

- Fase 1 (Translator) → Fase 2 (use case de traducción) → Fase 3 (revalidate BFF) → Fase 4 (revalidate backend)
- La revalidación (Fase 3/4) **depende** de la traducción (Fase 1/2) porque el orden es validate → translate → write → revalidate

**No bloquea:** MT1.3 (cliente HTTP), MT1.5 (despliegue temprano — usa traductor falso)

---

### 6. Riesgos y consideraciones

1. **Google Cloud Translation credenciales:** debe vivir en Secret Manager, nunca en el repo (D23). El fake translator permite desarrollar sin credenciales.
2. **Timeout de 10 s:** el `Translator` real debe tener un timeout configurable; si excede, marca `enPendiente` pero no falla la escritura.
3. **Control de costo (AC0.5.2):** implementar detección de cambios — comparar `es` actual vs. anterior. Requiere leer el documento existente antes de escribir (o confiar en el `en` ya persistido).
4. **Revalidación en ambos idiomas:** el helper del BFF debe mapear cada ruta afectada a sus variantes `/es/...` y `/en/...`.
5. **`autoTranslate` y `enPendiente` solo backend:** el DTO del admin no debe aceptar estos campos (AC0.5.10). El backend los sobrescribe.
