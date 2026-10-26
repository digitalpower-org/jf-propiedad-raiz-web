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

> El Emulator UI **sí arranca** aunque uses `--only`; aparece en el log pero no en la tabla si no está en la lista.

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
# Ejecutar con emuladores ARRIBA
node firestore-seed.js
```

### Qué hace:
1. Conecta a `http://localhost:8080?ns=jf-propiedad-raiz` (emulador Firestore)
2. **Borra** documentos existentes en `authorized_users` (idempotente)
3. **Crea** 5 usuarios admin con rol `admin` y `active: true`
4. Usa `admin.firestore.FieldValue.serverTimestamp()` para `createdAt`

### Requisitos:
- Emuladores corriendo (`firebase emulators:start ...`)
- Archivo `firebase-service-key.json` en la raíz del proyecto
- Proyecto `jf-propiedad-raiz` en `.firebaserc`

### Usuarios que crea:
| Email | Rol | Activo |
|-------|-----|--------|
| admin@jfu24.com | admin | true |
| santiago.santifer@gmail.com | admin | true |
| emilio.ortiz234@gmail.com | admin | true |
| michellecorrea.all@gmail.com | admin | true |
| aylynandres2019@gmail.com | admin | true |

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

### Scripts npm sugeridos (añadir a `package.json` root):

```json
{
  "scripts": {
    "emulators": "firebase emulators:start --project=jf-propiedad-raiz --import=~/.firebase/emulators/firestore-data --export-on-exit=~/.firebase/emulators/firestore-data",
    "emulators:clean": "rm -rf ~/.firebase/emulators/firestore-data && firebase emulators:start --project=jf-propiedad-raiz",
    "emulators:only": "firebase emulators:start --only auth,firestore,functions,apphosting --project=jf-propiedad-raiz",
    "seed:admins": "node firestore-seed.js"
  }
}
```

```bash
npm run emulators       # desarrollo diario con persistencia
npm run emulators:clean # borra datos y arranca limpio
npm run seed:admins     # reseed de admins
```

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