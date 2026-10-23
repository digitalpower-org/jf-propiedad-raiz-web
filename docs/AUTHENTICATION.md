# docs/AUTHENTICATION.md
# Autenticación y control de acceso

> **Fuente de verdad** del diseño de autenticación y sesión para el catálogo inmobiliario.
> El **backend** valida el idToken de Firebase (login y refresh) y **autoriza** las rutas de administrador; el **BFF** emite y valida el **JWT de sesión** de la cookie, con **65 minutos** de validez. El redirect tras el login es a **`/admin`**; el logout responde **204**; el conjunto de administradores se acota a **≤ 5**; los workspaces se gestionan con **npm únicamente**; la comunicación BFF ↔ backend usa **`X-Internal-Key`** (OIDC como mejora futura opcional).

---

## 1. Resumen

- Dos tipos de usuario: **Visitante** (sin sesión, solo rutas públicas) y **Administrador** (con sesión, gestiona el catálogo).
- El admin inicia sesión **únicamente con Google** (Firebase Auth). Solo se le emite acceso si su correo está en la **lista blanca** (colección `authorized_users` en Firestore) y activo; el **backend** lo verifica (a petición del BFF) al canjear el idToken.
- El **frontend nunca habla con el backend**. Existe un **BFF** (Next.js) que media todas las peticiones.
- El BFF reenvía el **idToken** de Firebase al **backend** para que lo **valide**; si la validación es exitosa, el BFF emite su **JWT propio** en una **cookie HttpOnly**. A partir de ahí, el navegador solo manda esa cookie (`__session`, D33) al BFF, que la valida en el envoltorio de cada route handler con sesión (D32).
- El BFF → backend se autentica con una **`X-Internal-Key`** (secreto compartido) y propaga la identidad en cabeceras `X-User-*`; el **backend** es la autoridad de **identidad** (valida idTokens) y de **autorización** (rutas de admin).
- La lista blanca de administradores vive en Firestore (colección `authorized_users`), no en Firebase Auth ni en variables de entorno. Firebase Auth aporta solo la identidad (Google); la autorización la decide el **backend**.
- No se implementa ningún endpoint de refresh propio: la renovación la maneja el **SDK de Firebase** en el cliente.

---

## 2. Actores

- **Visitante**: no se autentica. Accede solo a rutas públicas del frontend (`/`, listados, ficha de propiedad, etc.). Nunca recibe ni maneja tokens.
- **Administrador**: inicia sesión **solo con Google**. Requisito: su correo debe estar en la **lista blanca** (`authorized_users`) y activo. Tras el login, el **backend** verifica el idToken y autoriza según esa lista; si es correcto, el BFF emite la sesión propia (cookie).

> El conjunto de administradores es muy pequeño (≤ 5) y se gestiona en la colección `authorized_users` de Firestore (operación de servidor).

---

## 3. Arquitectura y flujo de red

```
                      (1) signInWithPopup(Google)
   ┌──────────────┐  ───────────────────────────►  ┌───────────────┐
   │   Navegador  │                                 │ Firebase Auth │
   │  (React /    │  ◄───────────────────────────  │ (Google       │
   │   Next.js)   │        (2) idToken              │  sign-in)     │
   └──────┬───────┘                                 └───────────────┘
          │
          │ (3) POST /api/auth/session  Authorization: Bearer <idToken>
          │     + resto de peticiones con cookie HttpOnly
          ▼
   ┌───────────────────────────┐
   │   BFF (Next.js)           │   App Hosting, MISMO ORIGEN que el navegador
   │   - firma/valida su JWT   │   - gestiona y valida la cookie de sesión
   │   - NO valida idTokens    │   - proxy del resto de rutas
   └───────────┬───────────────┘
               │ (3b) valida idToken + lista blanca (POST interno, X-Internal-Key)
               │ (4)  X-Internal-Key + X-User-Id/Email/Role
               ▼
   ┌───────────────────────────┐
   │  Backend API REST         │   Firebase Functions (monolito `api`)
   │  (Clean Architecture)     │   - valida idTokens de Firebase (login/refresh)
   │                           │   - autoriza las rutas de administrador
   │                           │   - rechaza sin X-Internal-Key válida
   └───────────┬───────────────┘
               ▼
   ┌───────────────────────────┐
   │  Firestore (NoSQL)        │   Catálogo + lista blanca (admins)
   └───────────────────────────┘
```

**Principios de red:**

1. El navegador **solo** alcanza al BFF (mismo origen). Nunca al backend directamente.
2. El BFF es el **único** cliente del backend.
3. El backend rechaza cualquier petición que no traiga una `X-Internal-Key` válida.
4. El **backend** es la autoridad de **identidad** (valida los idTokens de Firebase en login/refresh) y de **autorización** (rutas de administrador); el BFF solo transporta y valida la sesión.

---

## 4. Elementos del sistema

| Elemento | Rol | Notas |
| :---- | :---- | :---- |
| **Frontend (Next.js + React)** | UI web | Controla rutas públicas/privadas, muestra "Iniciar sesión con Google", gestiona estado con el SDK de Firebase Auth (`onAuthStateChanged`, `onIdTokenChanged`, `signInWithPopup`, `signOut`). **No** muestra ningún flujo de registro ni creación de cuenta. **No** guarda el idToken en `localStorage`. |
| **BFF (Next.js)** | Backend for Frontend | Mismo despliegue/origen que el front (App Hosting). Único interlocutor del backend. **No** valida idTokens de Firebase: los reenvía al backend. Firma su **JWT propio** en cookie HttpOnly y lo valida en el envoltorio de cada route handler con sesión (D32), no en el Proxy; reenvía al backend el resto de rutas añadiendo `X-Internal-Key` + `X-User-*`. |
| **Firebase App Hosting** | Alojamiento front + BFF | Sirve la app Next.js (frontend y BFF en el **mismo origen**, lo que simplifica cookies `SameSite=Strict`). |
| **Backend (Firebase Functions — monolito `api`)** | API REST (Clean Architecture) | **Valida los idTokens de Firebase (login/refresh) y la lista blanca** en su endpoint interno de sesión; **autoriza** las rutas de administrador. En las rutas de negocio valida `X-Internal-Key` y confía en `X-User-*` propagadas por el BFF. |
| **Lista blanca (`authorized_users`)** | Guardia de autorización en el **backend** | Colección de Firestore `authorized_users` (`email`, `role`, `active`, `createdAt`). Es la fuente de la autorización, consultada por el backend. |
| **`POST /api/auth/session` (BFF)** | Puerta de acceso | El BFF pide al backend validar el idToken y la lista blanca; solo si el backend confirma, el BFF emite la cookie de sesión. Responde 403 `PERMISSION_DENIED` cuando el backend deniega. |
| **Firebase Auth** | Proveedor de identidad | Único proveedor para admins: Google. No se pre-crean cuentas ni se usan blocking functions (requieren Identity Platform / plan Blaze). Cualquier cuenta de Google puede completar el sign-in; el acceso lo decide el **backend**. |
| **Firestore (NoSQL)** | Persistencia de negocio | Catálogo inmobiliario (propiedades, tipos, estados, imágenes...) y la lista blanca `authorized_users`. **No** se registran sesiones aquí en v1. |
| **Shared-types** | Tipos compartidos | Contratos tipados entre `client`, `bff` y `functions`. |
| **`X-Internal-Key`** | Secreto compartido | Autentica al **BFF** frente al backend. Vive en variables de entorno/Secret Manager de ambos y **nunca** en el bundle del cliente. |

---

## 5. Las DOS sesiones (concepto clave)

Es habitual confundir una sola "sesión". Aquí hay **dos**, en sitios distintos:

| Sesión | Qué guarda | Dónde | Vida | Quién la gestiona |
| :---- | :---- | :---- | :---- | :---- |
| **Sesión Firebase** | idToken + **refresh token** | IndexedDB del navegador (`browserLocalPersistence`, persistida por el SDK) | Refresh token: larga. idToken: ~1 h | SDK de Firebase (cliente); el idToken lo **valida el backend** en login/refresh |
| **Sesión BFF** | **JWT propio** (`sub`, `email`, `role`, `iss`, `aud`, `iat`, `exp`; D34) | Cookie `__session`, `HttpOnly` | **65 min** | BFF |

Consecuencias:

- La sesión de Firebase **persiste aunque la app no retenga el idToken en memoria**. Por eso el front puede "olvidar" el idToken y aun así renovarlo: el SDK tiene el refresh token.
- La cookie del BFF es **invisible para JavaScript** (HttpOnly), por lo que el front no puede leer su expiración y debe renovarla según se describe en la sección 8.

---

## 6. Alta y gestión de administradores (lista blanca)

1. **Añadir un administrador** = crear/actualizar su documento en `authorized_users` (`{ email, role, active, createdAt }`, correo en minúsculas, `active: true`). Es una operación de servidor (seed, script o consola de Firestore), no de Firebase Auth.
2. El admin abre la web y pulsa **"Iniciar sesión con Google"**. Firebase Auth acepta cualquier cuenta de Google y devuelve un idToken.
3. El **backend** verifica el idToken y comprueba el correo contra `authorized_users` (a petición del BFF): si existe y `active = true`, el BFF emite la sesión; si no, el backend deniega y el BFF responde **403 `PERMISSION_DENIED`** sin emitir cookie.
4. No hay blocking functions: el alta de identidad en Firebase Auth es libre, pero el **backend** es la puerta que decide el acceso.

> **Nota:** como no hay `beforeUserCreated`, Firebase Auth puede crear identidades para cuentas de Google no autorizadas. Son **inofensivas**: sin entrar en la lista blanca, el backend nunca autoriza y el BFF nunca emite sesión. Quitar a un administrador = `active: false`; el corte surte efecto al expirar la cookie vigente (≤ 65 min).

---

## 7. Flujo de Login

```
1. Admin accede a /admin/login (público)
2. Pulsa "Iniciar sesión con Google" -> signInWithPopup(GoogleAuthProvider)
3. Firebase Auth muestra el selector de Google.
     - Google acepta el login -> Firebase emite idToken (el alta de identidad no se bloquea)
4. Cliente: const idToken = await user.getIdToken()
5. Cliente: POST /api/auth/session  (Authorization: Bearer <idToken>)
     -> INMEDIATAMENTE después, el front blanquea la variable que contenía el idToken
6. BFF: reenvía el idToken al BACKEND por el endpoint interno (X-Internal-Key)
7. Backend: verifyIdToken(idToken, true) + comprueba el correo en authorized_users (active = true)
     - Correo fuera de la lista blanca -> el backend deniega (403) -> el BFF responde 403 -> login falla ("Acceso denegado")
8. Backend: responde la identidad verificada { uid, email, role }
9. BFF: construye su propio JWT `{ sub: uid, email, role, iss: "jf-bff", aud: "jf-web", iat: now, exp: iat + 65 min }` (D34)
10. BFF: responde 200 y setea la cookie `__session` (HttpOnly + Secure + SameSite=Strict) con el JWT propio
11. Front redirige a /admin
12. Peticiones siguientes: el navegador envía SOLO la cookie al BFF -> el BFF valida el JWT -> el BFF propaga X-User-* al backend -> el backend autoriza
```

**Reglas del paso 6:**

- "Blanquear la variable" = dejar que se libere la **variable JS de aplicación** que contiene el idToken (o ponerla a `null`).
- **NUNCA** se llama `signOut()` ni se limpia la persistencia del SDK en este punto: eso destruiría la sesión de Firebase y haría imposible el refresh.

**Decisión de transporte (front → BFF, una sola vez):**

- El idToken se envía al BFF en la cabecera **`Authorization: Bearer <idToken>`** en `POST /api/auth/session`.
- El idToken **no** se persiste en `localStorage` ni en cookies. Vive en memoria solo durante el canje.

---

## 8. Flujo de Refresh

Los **ID tokens** de Firebase expiran típicamente a la **1 hora**. El propio **SDK de Firebase** los renueva de forma transparente usando el refresh token persistido. **No se implementa ningún "refresh endpoint" ni JWT perpetuo.**

### 8.1 Renovación del idToken de Firebase (automática, SDK)

- El SDK renueva el idToken ~cada 55 min sin intervención tuya.
- El evento correcto es **`onIdTokenChanged`**:
  - `onAuthStateChanged` → dispara **solo** en login/logout.
  - `onIdTokenChanged` → dispara en login, logout **y en cada renovación** del idToken.
- Para obtener un token vigente bajo demanda: `await auth.currentUser.getIdToken()`. Forzar renovación: `getIdToken(true)`.

### 8.2 Renovación de la sesión BFF (cookie de 65 min)

La cookie se emite con **65 min** de validez: un margen pequeño sobre la vida del idToken de Firebase (~1 h) para que la renovación (reactiva o proactiva) reemita la cookie antes de que expire. Como la cookie es `HttpOnly`, el front no puede leer su expiración. Dos estrategias combinables:

- **Reactiva (mínimo para v1):** ante un **401** del BFF, el front llama `getIdToken()` (obtiene uno vigente) y repite `POST /api/auth/session`. El BFF reenvía el idToken al backend para **revalidarlo** y re-emite la cookie. Funciona incluso tras recargar, porque la sesión de Firebase persiste.
- **Proactiva:** el BFF devuelve `{ expiresAt }` en la respuesta de `/api/auth/session` y el front agenda la re-sincronización; **o** el front se suscribe a `onIdTokenChanged` y re-sincroniza con `/api/auth/session` (que revalida el idToken en el backend) en cada emisión de token (~cada hora).

**Recomendación:** reactiva + `onIdTokenChanged`. Simple, robusto y sin sesiones eternas.

### 8.3 ¿Quién "sabe" que hay que renovar?

- Del **idToken** sabe el **SDK de Firebase** (tiene el refresh token). El front se entera vía `onIdTokenChanged`.
- De la **cookie** sabe el **BFF** (la firma/verifica). El front se entera vía **401** o vía `expiresAt` devuelto por el BFF.

### 8.4 Edge case: cookie válida pero sesión Firebase perdida

Si el SDK pierde su sesión (p. ej. IndexedDB borrado) pero la cookie del BFF sigue viva, el front puede creer que está deslogueado mientras el BFF acepta la cookie. Se resuelve con un endpoint **`GET /api/auth/me`** en el BFF: confirma la sesión y permite al front sincronizar el estado.

---

## 9. Flujo de Logout

El logout es **bidireccional**: hay que limpiar la sesión de Firebase **y** la cookie del BFF.

```
1. Admin pulsa "Cerrar sesión"
2. Cliente: await signOut(auth)     (Firebase Auth limpia sesión local + refresh token)
3. Cliente: POST /api/auth/logout
4. BFF: borra la cookie `__session` (Max-Age=0 / expires=epoch, mismo Path/Domain/Secure/SameSite)
5. Respuesta 204 -> redirigir a / (público)
```

> **Importante:** si solo se hace `signOut()` en cliente **sin borrar la cookie**, el navegador seguirá enviando la cookie antigua hasta su expiración. El paso 4 es **obligatorio**.

---

## 10. BFF → Backend (sesión y autenticación interna)

### 10.1 Establecimiento de sesión (login y refresh)

Para `POST /api/auth/session`, el BFF **no** valida el idToken por sí mismo: llama a un **endpoint interno** del backend.

- **Endpoint:** `POST /internal/auth/verify` (**confirmado**; forma parte de `./openapi.backend.yaml`, D26). Su nombre y su contrato son fijos: `/internal/*` es el **plano entre planos** del backend, sin versionar y **nunca alcanzable desde el navegador** (D30).
- **Autenticación:** `X-Internal-Key` (igual que el resto del tráfico BFF↔backend). **Nunca** se expone al navegador.
- **Entrada:** el idToken de Firebase.
- **Proceso (backend):** `verifyIdToken(idToken, true)` + consulta `authorized_users` (`email`, `active = true`).
- **Salida:** 200 con `{ uid, email, role }` o 401/403 si el idToken es inválido/revocado o el correo no está autorizado.
- El BFF traduce el 403 del backend a **403 `PERMISSION_DENIED`** y no emite cookie.

### 10.2 Peticiones de negocio (envoltorio del handler)

Cada route handler se declara con un envoltorio que consulta el catálogo único `packages/client/src/server/routes.ts` (D31) y aplica la política de **su** ruta (D32). El Proxy **no** autentica: solo cierra la superficie con 404/405 (AC0.1.6).

**Rutas `session`:**

1. El envoltorio valida la cookie (JWT propio: firma, `exp`) **antes** de ejecutar el handler y antes de leer el cuerpo.
2. Inválida o expirada → **401** con la envoltura estándar (el front dispara el refresh de la sección 8).
3. Válida → deriva `{ sub, email, role }` de los claims verificados y reenvía al backend añadiendo:

```
X-Internal-Key: <secreto compartido BFF<->backend>
X-User-Id:      <uid>
X-User-Email:   <email>
X-User-Role:    admin
X-Request-Id:   <uuid>          (opcional, correlación/logs)
```

**Rutas `public`:** no se lee la cookie ni se adjuntan `X-User-*` (p. ej. `POST /api/consignments`, que solo propaga `X-Client-IP`).

**Rutas `internal`:** la autoridad es `X-Internal-Key` —el mismo secreto que el BFF usa saliente hacia Functions—, no la cookie; es el caso de `POST /api/revalidate` (AC1.3.6).

**Respuestas `session`:** `Cache-Control: no-store`; nunca se sirven desde caché compartida (AC1.3.7).

**Por qué en el handler y no en el Proxy:** si la comprobación viviera solo en el Proxy, un `matcher` mal configurado, un rewrite futuro o una invocación directa del handler (pruebas, *fetch* interno) la saltarían. Con el envoltorio, cada handler es defendible por sí mismo y se prueba sin Proxy; el coste es un HMAC por petición, sin I/O (sesión *stateless*, AC1.2.8).


**Cierre de la superficie (AC0.1.6):** antes del router de Next.js y sin decidir sesión ni reenvío, `packages/client/src/proxy.ts` distingue entre ruta no declarada y método no permitido con *path-first*: si la ruta no existe → **404 `NOT_FOUND`** con la envoltura estándar; si existe pero el método no está declarado → **405 `METHOD_NOT_ALLOWED`** con la envoltura estándar y cabecera `Allow` (añade `HEAD`/`OPTIONS` cuando corresponde). `HEAD`/`OPTIONS` se delegan a Next.js cuando son válidos. Los errores nunca se devuelven como HTML ni con cuerpo vacío.

**Nomenclatura:** se usa el prefijo `X-User-*` por claridad y autoexplicación (`X-User-Id/Email/Role`), en lugar de `X-Id/X-Email/X-Role`.

**Contrato del backend:**

- Verifica `X-Internal-Key` **antes** de cualquier lógica. Si falta o no coincide → **401/403** y se rechaza.
- Confía en `X-User-*` **solamente** porque la petición viene autenticada por la `X-Internal-Key`.
- **Valida los idTokens de Firebase solo en `POST /internal/auth/verify`** (login/refresh); en las rutas de negocio no los ve.
- **Autoriza** las rutas de administrador comprobando `X-User-Role: admin`. El rol procede de `authorized_users` y se resuelve en el login; no reconsulta la whitelist por petición (revocación acotada al TTL del JWT, ≤ 65 min).

> **Endurecimiento opcional (futuro):** en lugar de un secreto compartido, proteger el backend con Cloud Run `--no-allow-unauthenticated` y que el BFF use un **OIDC token** de service account. Más fuerte, algo más de setup; no requerido para v1.

---

### 10.3 Verificación del JWT de sesión (D34)

`verifySession()` se ejecuta en el envoltorio del handler (D32) antes de toda lógica y aplica las comprobaciones **en este orden**; cualquier fallo corta con **401 `UNAUTHORIZED`** y la misma forma, sin revelar cuál falló:

| # | Comprobación | Regla |
| :-- | :---- | :---- |
| 1 | Valor único | Si la petición trae más de un `__session`, se rechaza |
| 2 | Tamaño | ≤ 4 KB |
| 3 | Formato y algoritmo | Tres segmentos base64url válidos; `alg` **exactamente** `HS256` (se rechazan `none`, `RS256`, `HS384`…) |
| 4 | Firma | HMAC válido, comparación en tiempo constante |
| 5 | Emisor/audiencia | `iss = "jf-bff"` y `aud = "jf-web"` |
| 6 | Claims | `sub`, `email` y `role` presentes y `string` no vacío; `iat` y `exp` numéricos (segundos) |
| 7 | `iat` | `iat ≤ now + 60 s` |
| 8 | `exp` | `exp ≥ now − 60 s` |
| 9 | Invariante de TTL | `iat ≤ exp` y `exp − iat = 3900 s` |

**Lo que NO se comprueba y por qué:**

- **`nbf`:** no se emite; si aparece, se ignora.
- **Rol:** el BFF solo exige que `role` sea un string no vacío. Compararlo con `admin` sería autorización de negocio, que es del backend con `X-User-Role` (D27).
- **Revocación:** no hay denylist, ni `jti`, ni consulta a Firestore por petición (D29). Un token copiado sigue siendo válido hasta su `exp`; el logout borra la cookie, no invalida el JWT.
- **Ventana absoluta:** no existe. Una sesión activa se renueva indefinidamente mientras el idToken de Firebase siga siendo válido (§8.2).

**Rotación del secreto:** `SESSION_JWT_SECRET` (actual) y `SESSION_JWT_SECRET_PREVIOUS` (saliente). Se verifica con ambos y se firma con el actual; la variable anterior se retira cuando han pasado ≥ 65 min desde la última emisión con la clave vieja. Sin `kid`.

**Matriz de pruebas** (todas → 401 salvo donde se indique):

| Caso | Esperado |
| :---- | :---- |
| Token válido | Pasa y entrega `{ sub, email, role }` |
| `exp` vencido hace > 60 s | 401 |
| `exp` vencido hace < 60 s | Pasa (tolerancia) |
| `iat` en el futuro > 60 s | 401 |
| Firma alterada o secreto distinto | 401 |
| `alg: none` o `RS256` | 401 |
| `iss` o `aud` distintos | 401 |
| Falta `sub`, `email` o `role`, o tipo incorrecto | 401 |
| `exp − iat` ≠ 3900 s | 401 |
| Token truncado, base64 inválido o > 4 KB | 401 sin excepción |
| `Cookie: __session=a; __session=b` | 401 |

**Observabilidad:** se registra `requestId` y un motivo interno (`expired`, `bad_signature`, `bad_claims`…), nunca el token ni la cookie.

---

## 11. Seguridad

| Control | Decisión |
| :---- | :---- |
| **Cookie de sesión (BFF)** | `__session` (D33): `HttpOnly: true`, `Secure: true` (obligatorio en prod), `SameSite: Strict`, `Path: '/'`. Sin `Domain` ambiguo. |
| **CSRF** | Front y BFF en **mismo origen** → `SameSite=Strict` mitiga el grueso. Verificar `Origin` en rutas mutantes. |
| **`X-Internal-Key`** | Secreto fuerte y **rotable** en Secret Manager / env de BFF y backend. HTTPS obligatorio. **Nunca** en el bundle del cliente. |
| **Firma del JWT del BFF** | `HS256` con secreto en Secret Manager/env (D34). Rotación con solape ≥ 65 min (`SESSION_JWT_SECRET_PREVIOUS`). Nunca en el cliente. |
| **Endpoint interno de sesión** | `POST /internal/auth/verify` accesible **solo** con `X-Internal-Key`; nunca expuesto al navegador. Es el único punto donde el backend ve un idToken. Su nombre y su contrato son fijos (D30). |
| **Planos del backend** | `/api/v1/*` = API de dominio versionada, siempre con identidad propagada `X-User-*`. `/internal/*` = operaciones **entre planos**, sin versionar, **nunca alcanzables desde el navegador** (D30). El BFF es el único cliente de este plano; el backend es su único cliente de `/api/v1/*`. |
| **Superficie del backend** | Las Functions HTTP son **públicas por defecto**; el aislamiento de red **no** es una garantía. La `X-Internal-Key` es el gate. |
| **XSS** | El idToken en memoria + cookie HttpOnly reducen superficie. El refresh token vive en IndexedDB (tradeoff conocido del SDK). Aplicar CSP y disciplina anti-XSS. |
| **Logs** | No loguear tokens completos. Loguear `uid` + `email` solo si hace falta auditoría. |
| **Registro de cuentas** | No existe flujo de "crear cuenta" en el front. La barrera real es la **lista blanca** verificada por el **backend** (a petición del BFF) en el login. |

---

## 12. Backend con Clean Architecture

El monolito `api` en Functions mantiene las **cuatro capas**:

```
functions/
  src/
    domain/          # Entidades y reglas de negocio (propiedades, tipos, estados...)
    application/     # Casos de uso (p. ej. auth/authorizeAdmin, CRUD de catálogo)
    infrastructure/  # Adaptadores: Firebase Admin (verifyIdToken), Firestore (incl. authorized_users), verificación de X-Internal-Key
    presentation/    # HTTP: controllers, rutas, middlewares (auth.middleware.ts / internalKey.middleware.ts)
```

Reglas:

- La validación del secreto interno y la construcción del `authContext { uid, email, role }` viven en `infrastructure` / `presentation/middlewares`, no en los controllers. La **verificación del idToken y de la lista blanca** (login/refresh) es un caso de uso de `application` que usa el adaptador de Firebase Admin.
- Los casos de uso no conocen HTTP ni Firebase directamente; dependen de interfaces.

Ejemplo de responsabilidades del middleware:

- `internalKey.middleware.ts`: exige una `X-Internal-Key` válida en todas las rutas privadas.
- `auth.middleware.ts`: construye el `authContext` a partir de `X-User-*` y lo inyecta en la request.
- `role.middleware.ts`: exige `X-User-Role: admin` en las rutas exclusivas de administrador (autorización).

---

## 13. Alcance de esta v1 (qué NO se hace)

- **No** hay sesiones en Firestore (solo la lista blanca `authorized_users`).
- El BFF **no** valida idTokens de Firebase; la única validación de idTokens ocurre en el backend (`POST /internal/auth/verify`).
- **No** hay blocking functions de Firebase Auth (requieren Identity Platform / plan Blaze). La lista blanca vive en `authorized_users` (Firestore), no en `.env`.
- **No** hay endpoint de refresh propio ni JWT sin vencimiento.
- **No** hay soporte para otros proveedores de identidad (solo Google).
- **No** hay flujo de registro/creación de cuenta en el front.
- **No** hay (aún) soporte para `Authorization: Bearer` en las peticiones subsecuentes: la sesión viaja en cookie. Se añadirá si aparece un cliente mobile/CLI.
- **No** se distinguen otros roles: cualquier sesión es de `admin` (los demás son visitantes sin sesión).

---

## 14. Puntos abiertos

- **Gestión del monorepo:** definir cómo se consume `shared-types` desde `client` y `functions`.
- **`/api/auth/me`:** implementar para sincronizar estado cuando la cookie y la sesión de Firebase divergen.
- **Rotación de secretos:** ~~definir política de rotación de `X-Internal-Key` y del secreto de firma del JWT del BFF.~~ **Cerrado por D34 para el JWT de sesión:** rotación con solape ≥ 65 min (`SESSION_JWT_SECRET_PREVIOUS`). Queda pendiente la política de rotación de `X-Internal-Key`.
- **Endpoint interno de sesión:** ~~confirmar el nombre exacto (`POST /internal/auth/verify`) y su contrato en `./openapi.backend.yaml`.~~ **Cerrado por D30:** el plano `/internal/*` queda fijado como garantía (ver §10.1 y §11); el nombre y el contrato ya no son provisionales.

---

## Conclusión

El diseño usa un **BFF** como única frontera entre el navegador y el backend, con **dos sesiones separadas**:

- **Login:** Google; el **backend** verifica el idToken y la **lista blanca** (`authorized_users`, `active`); si autoriza, el **BFF** emite su **JWT propio** en cookie HttpOnly. Sin blocking functions.
- **Refresh:** delegado al **SDK de Firebase** (`onIdTokenChanged`); el front repite `POST /api/auth/session`, el **backend** revalida el idToken y el BFF renueva la cookie (reactiva por 401 o proactiva por `expiresAt`/`onIdTokenChanged`). Sin sesiones perpetuas.
- **Backend:** valida los idTokens (login/refresh), **autoriza** las rutas de administrador, y en las rutas de negocio se protege con **`X-Internal-Key`** + identidad propagada en `X-User-*`; sin sesiones en Firestore; la lista blanca vive en `authorized_users`.
- **Logout:** `signOut()` en cliente + **borrado explícito de la cookie** en el BFF.

Para el transporte de la sesión, la **cookie `HttpOnly` + `Secure` + `SameSite=Strict`** emitida por el BFF es el balance más seguro para este catálogo web.
