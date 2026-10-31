# Guía de Emuladores Locales — jf-propiedad-raiz-web

> Documentación para desarrollo local con Firebase Emulators (Auth, Firestore, Functions, App Hosting).

---

## 🚀 Arranque rápido

```bash
# 1. Instalar dependencias (raíz + workspaces)
npm install

# 2. Build de Functions (requerido para emulador)
cd packages/functions && npm run build && cd ../..

# 3. Levantar emuladores (todo + UI + persistencia)
firebase emulators:start \
  --project=jf-propiedad-raiz \
  --import=~/.firebase/emulators/firestore-data \
  --export-on-exit=~/.firebase/emulators/firestore-data
```

### Puertos

| Servicio | Puerto | UI |
|----------|--------|-----|
| **App Hosting (Next.js)** | 5002 | — |
| **Authentication** | 9099 | http://localhost:4000/auth |
| **Functions** | 5001 | http://localhost:4000/functions |
| **Firestore** | 8080 | http://localhost:4000/firestore |
| **Emulator UI** | 4000 | http://localhost:4000 |
| **Emulator Hub** | 4400 | — |
| **R2 (Silo)** | 9000 (API) / 9001 (consola) | — |

> El Emulator UI **sí arranca** aunque uses `--only`; aparece en el log pero no en la tabla si no está en la lista.

Para el día a día sin App Hosting usa `npm run emulators:be` (auth, firestore, functions).
El emulador de App Hosting solo se necesita para el smoke de integración.

---

## 🪣 R2 local (pgsty/silo)

El contenedor vive fuera del repo, en `../../docker-services/minio/docker-compose.yml`
(nombre `local_r2_minio`). Arranque e inicialización:

```bash
npm run r2:up      # docker compose up -d
npm run r2:init    # bucket + CORS + lifecycle + lectura anónima
```

`scripts/r2-init.sh` es idempotente y aplica:

| Elemento | Valor |
|---|---|
| Bucket | `jf-media` |
| Endpoint | `http://127.0.0.1:9000` |
| Consola | `http://127.0.0.1:9001` (`minioadmin` / `minioadmin`) |
| CORS | `infra/r2/cors.xml` (orígenes 3000 y 5002) |
| Lifecycle | `pending/` expira a 1 día (AC1.9.16) |
| Lectura pública | `mc anonymous set download` (emula el dominio público de R2) |

Verificación: `mc cors get local/jf-media` y `mc ilm rule ls local/jf-media`.

### ⚠️ Riesgos de fidelidad R2 (Fase 4)

| Riesgo | Descripción | Mitigación |
|--------|-------------|------------|
| CORS/lifecycle | Se configuran por dashboard/API de Cloudflare, no necesariamente por S3 API. MinIO/Silo emula parcialmente pero no es idéntico. | Probar en staging real antes de promover a producción. |
| Dominio público | `r2.dev` / custom domain no se emula en local. | Mantener `R2_PUBLIC_BASE_URL` en config; nunca hardcodear URLs públicas. |
| Checksums | El SDK 3.1160+ firma `x-amz-checksum-crc32` dentro de URLs presignadas. Silo lo tolera; R2 en producción puede rechazarlas. | `requestChecksumCalculation: 'WHEN_REQUIRED'` y `responseChecksumValidation: 'WHEN_REQUIRED'` en `r2-client.ts`. |
| Presigned URL expiración | `X-Amz-Expires` debe respetarse; R2 en producción aplica límites propios. | Usar `expiresIn=900` (15 min) por defecto en `presignPut`. |

---

## 📁 Configuración clave

### `firebase.json` (emuladores)

```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "ui": { "enabled": true },
    "singleProjectMode": true,
    "apphosting": {
      "port": 5002,
      "rootDirectory": "packages/client",
      "startCommand": "npm run dev"
    }
  }
}
```

### `.firebaserc`

```json
{
  "projects": { "default": "jf-propiedad-raiz" }
}
```

---

## 🔐 Variables de entorno — `packages/client/.env.local`

Crea este archivo para que el cliente Next.js se conecte a los emuladores:

```env
# packages/client/.env.local
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST=localhost:8080
NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST=localhost:5001
```

> Sin esto, el cliente intentará conectarse a producción.

### `packages/functions/.env` (backend)

El emulador de Functions **no lee** `packages/client/.env.local` ni el `.env.local` de la raíz.
Solo inyecta `FIREBASE_AUTH_EMULATOR_HOST` y `FIRESTORE_EMULATOR_HOST`; el resto
(R2, traductor, `BFF_INTERNAL_KEY`) va en `packages/functions/.env` (gitignored).
Plantilla: `packages/functions/.env.example`.

> `BFF_INTERNAL_KEY` debe ser idéntica en `packages/client/.env.local` y
> `packages/functions/.env`. Si difieren, `/internal/auth/verify` devolverá 401.

---

## 🛡️ Reglas de Firestore — `firestore.rules`

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // DENY por defecto
    match /{document=**} {
      allow read, write: if false;
    }

    // authorized_users (lista blanca admins — MT1.2)
    match /authorized_users/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // properties (catálogo público)
    match /properties/{propertyId} {
      allow read: if resource.data.status == 'ACTIVE';
      allow write: if request.auth != null;
    }

    // services (CMS servicios)
    match /services/{serviceId} {
      allow read: if resource.data.status == 'ACTIVE';
      allow write: if request.auth != null;
    }

    // pages/nosotros
    match /pages/{pageId} {
      allow read: if pageId == 'nosotros';
      allow write: if request.auth != null;
    }

  }
}
```

> **Nota:** El Admin SDK (usado por `firestore-seed.js`) **omite** las reglas. Estas reglas solo afectan al SDK cliente.

---

## 🌱 Seed de administradores — `firestore-seed.js`

```bash
# Ejecutar con emuladores ARRIBA (inyecta FIRESTORE_EMULATOR_HOST)
npm run seed:admins
```

### Qué hace:
1. Conecta a `http://localhost:8080?ns=jf-propiedad-raiz` (emulador Firestore)
2. **Borra** documentos existentes en `authorized_users` (idempotente)
3. **Crea** 6 usuarios admin con rol `admin` y `active: true`
4. Usa `admin.firestore.FieldValue.serverTimestamp()` para `createdAt`
5. Usa el email en minúsculas como **docId** (`doc(email.toLowerCase())`)

### Requisitos:
- Emuladores corriendo (`firebase emulators:start ...`)
- `FIRESTORE_EMULATOR_HOST` definido (lo hace `npm run seed:admins`)
- `firebase-service-key.json` solo si se ejecuta contra un proyecto real

### Usuarios que crea:
| Email (= docId) | Rol | Activo |
|-------|-----|--------|
| admin@test.local | admin | true |
| dpa70.dev@gmail.com | admin | true |
| santiago.santifer@gmail.com | admin | true |
| emilio.ortiz234@gmail.com | admin | true |
| michellecorrea.all@gmail.com | admin | true |
| aylynandres2019@gmail.com | admin | true |

### Identidad de pruebas E2E

```bash
curl -s -X POST "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@test.local","password":"password123","returnSecureToken":true}'
```

Devuelve un `idToken` que el backend puede verificar con el Admin SDK en el emulador.

---

## 💾 Persistencia de datos

Por defecto, **los datos se pierden al cerrar** (emulador en memoria).

### Con persistencia (recomendado):

```bash
# Primera vez: crear carpeta
mkdir -p ~/.firebase/emulators/firestore-data

# Arrancar con persistencia
firebase emulators:start \
  --project=jf-propiedad-raiz \
  --import=~/.firebase/emulators/firestore-data \
  --export-on-exit=~/.firebase/emulators/firestore-data
```

| Flag | Efecto |
|------|--------|
| `--import` | Carga datos guardados al iniciar |
| `--export-on-exit` | Guarda datos al cerrar (Ctrl+C) |

### Scripts npm (ya en `package.json` root):

```json
{
  "scripts": {
    "emulators": "firebase emulators:start --project=jf-propiedad-raiz --import=~/.firebase/emulators/firestore-data --export-on-exit=~/.firebase/emulators/firestore-data",
    "emulators:clean": "rm -rf ~/.firebase/emulators/firestore-data && firebase emulators:start --project=jf-propiedad-raiz",
    "emulators:only": "firebase emulators:start --only auth,firestore,functions,apphosting --project=jf-propiedad-raiz",
    "emulators:be": "firebase emulators:start --only auth,firestore,functions --project=jf-propiedad-raiz",
    "r2:up": "docker compose -f ${R2_COMPOSE_FILE:-../../docker-services/minio/docker-compose.yml} up -d",
    "r2:down": "docker compose -f ${R2_COMPOSE_FILE:-../../docker-services/minio/docker-compose.yml} down",
    "r2:init": "bash scripts/r2-init.sh",
    "seed:admins": "FIRESTORE_EMULATOR_HOST=localhost:8080 node firestore-seed.js"
  }
}
```

```bash
npm run emulators       # desarrollo diario con persistencia
npm run emulators:be    # solo backend (sin App Hosting)
npm run emulators:clean # borra datos y arranca limpio
npm run r2:up           # R2 local
npm run r2:init         # bucket + CORS + lifecycle
npm run seed:admins     # reseed de admins (6 usuarios)
```

---

## 🔐 Endpoint interno `internalAuth` (`/internal/auth/verify`)

Este endpoint solo es alcanzable desde el BFF (lleva `X-Internal-Key`). **No se expone al navegador** (D26, D30).

```bash
# Verificar un idToken contra la lista blanca (usar idToken obtenido del emulador Auth)
curl -s -X POST "http://127.0.0.1:5001/jf-propiedad-raiz/us-central1/internal/auth/verify" \
  -H 'Content-Type: application/json' \
  -H 'X-Internal-Key: 4s0Blfo4c0Zr7pfCYOAcpEaD8Zs/cppx0Jm4ozsmBgM=' \
  -d '{"idToken":"<idToken_de_Firebase>"}'
```

Respuesta esperada (200):
```json
{"success":true,"data":{"uid":"...","email":"admin@test.local","role":"admin"},"message":"Autenticación exitosa"}
```

Email no sembrado → 403 `PERMISSION_DENIED`. idToken inválido → 401 `UNAUTHORIZED`.

---

## 🍪 Nota sobre la cookie `__session` y el atributo `Secure`

La cookie `__session` se establece con `Secure; SameSite=Strict; HttpOnly` (D33, AC1.2.1). El atributo `Secure` significa que **el navegador solo la envía sobre HTTPS**. En localhost sobre `http://` (puerto 5002 del emulador App Hosting), el navegador **no almacenará ni enviará** la cookie.

Para probar el flujo de sesión con curl directamente contra el BFF, el atributo `Secure` no impide que `curl` reciba la cabecera `Set-Cookie`, pero sí impide que `curl` la reenvíe en peticiones subsiguientes a `http://localhost:5002`. Opciones:

1. Usar `curl --insecure` contra una URL `https://` (solo si hay terminación TLS).
2. Para pruebas E2E reales, usar Playwright (gate 7) que maneja las cookies del navegador correctamente.
3. En desarrollo local, el flujo se valida a través de `/api/auth/me` (200 con cookie válida, 401 sin ella) en el emulador App Hosting.

---

## 🛑 Detener emuladores

```bash
# En la terminal donde corren: Ctrl+C
# O desde otra terminal:
firebase emulators:stop
pkill -f "firebase emulators:start"
```

---

## 🔧 Comandos útiles

```bash
# Ver logs de Firestore
tail -f firestore-debug.log

# Ver logs de Firebase CLI
tail -f firebase-debug.log

# Limpiar datos del emulador (sin borrar carpeta de persistencia)
firebase emulators:clear

# Solo Functions (para desarrollo backend)
firebase emulators:start --only functions --project=jf-propiedad-raiz

# Solo Auth + Firestore (sin Functions/App Hosting)
firebase emulators:start --only auth,firestore --project=jf-propiedad-raiz
```

---

## 🧪 Testing con emuladores

### Functions (vitest + firebase-functions-test)

```bash
cd packages/functions
npm run test        # tests unitarios
npm run test:coverage
```

> Los tests usan `firebase-functions-test` que automáticamente detecta emuladores si están corriendo.

### Cliente (vitest + playwright)

```bash
cd packages/client
npm run test        # unitarios
npm run test:e2e    # E2E con Playwright
```

---

## 🩺 Health Endpoints

### Functions
```
GET /health  →  { "status": "ok", "service": "functions" }
```

**Local:** `http://127.0.0.1:5001/jf-propiedad-raiz/us-central1/health`

### BFF (Next.js) — **Implementado**
```
GET /api/health → agrega estado BFF + Functions
```

- BFF: siempre "ok" si la ruta responde
- Functions: llama a `${FUNCTIONS_BASE_URL}/health` con timeout (5s)
- Overall: `"ok"` si ambos ok, `"degraded"` si Functions falla
- Respuesta HTTP: `200` si ok, `503` si degraded

**Local:**
```
GET http://localhost:5002/api/health
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "bff": { "status": "ok", "service": "bff" },
    "functions": { "status": "ok", "service": "functions", "latencyMs": 12 },
    "overall": "ok"
  },
  "error": null
}
```

**Variable de entorno:** `FUNCTIONS_BASE_URL` (opcional, default: `http://127.0.0.1:5001/jf-propiedad-raiz/us-central1`)

---

### Estructura del código (para tests)

| Archivo | Responsabilidad |
|---------|-----------------|
| `packages/client/src/server/health.ts` | Lógica pura (testeable con vitest) |
| `packages/client/src/server/health.test.ts` | 11 tests unitarios (vitest) |
| `packages/client/src/app/api/health/route.ts` | Route handler Next.js (delegado a `health.ts`) |

> **Convención del proyecto:** vitest solo cubre `src/lib`, `src/i18n`, `src/server` (no `src/app`). La lógica de route handlers se extrae a `src/server/` para ser testeable.

---

## 🌐 Flujo completo de desarrollo

```mermaid
graph TD
    A[npm install] --> B[cd packages/functions && npm run build]
    B --> C[firebase emulators:start --project=jf-propiedad-raiz --import=... --export-on-exit=...]
    C --> D[node firestore-seed.js]
    D --> E[Abrir http://localhost:5002]
    E --> F[Login con Google (cualquier cuenta)]
    F --> G[Backend valida contra authorized_users]
    G --> H{¿En lista blanca?}
    H -->|Sí| I[Cookie __session emitida → /admin]
    H -->|No| J[403 PERMISSION_DENIED]
```

---

## ⚠️ Problemas comunes

| Problema | Solución |
|----------|----------|
| `MetadataLookupWarning` | Normal en local (no GCE). No afecta funcionamiento. |
| `functions: calls to production` | Falta emulador (database, storage, etc.). Usa `--only` o ignora. |
| Cliente no conecta a emulador | Verifica `packages/client/.env.local` y reinicia `next dev`. |
| Seed falla "permission denied" | Admin SDK omite reglas. Verifica que emulador Firestore está en 8080. |
| Puerto 5002 ocupado | Mata procesos previos: `pkill -f "next dev"` |
| UI no carga | Abre `http://localhost:4000` directamente. |

---

## 📚 Referencias

- [Firebase Emulators Suite](https://firebase.google.com/docs/emulator-suite)
- [App Hosting Local Emulator](https://firebase.google.com/docs/app-hosting/local-emulator)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [firebase-functions-test](https://github.com/firebase/firebase-functions-test)

---

## 📝 Notas de versión

- **Next.js 16.3.8** (Turbopack) — App Hosting emulator usa `npm run dev`
- **Node 24** — Requerido por `engines` en `package.json`
- **Firebase CLI** — `firebase-tools@latest` (ver `devEngines.packageManager`)

---

*Actualizado: 2026-10-25 — Para MT1.1 y MT1.2 implementados*