# Informe de modificaciones — MT1.2 Autenticación end-to-end

## Archivos modificados

### 1. `packages/functions/src/infrastructure/firebase/admin.ts`
**Cambio:** Modificación de `getAdminApp()` para inicializar Firebase Admin sin `FIREBASE_AUTH_EMULATOR_HOST` en el entorno, permitiendo que `verifyIdToken()` verifique contra **Firebase Auth de producción** mientras `FIRESTORE_EMULATOR_HOST` sigue apuntando al emulador de Firestore.

**Por qué:** El Admin SDK intentaba verificar los idTokens contra el emulador de Auth local en lugar de producción, lo que causaba que los idTokens reales de Firebase Auth fueran rechazados con "invalid signature".

### 2. `packages/functions/src/presentation/http/internal-auth.ts`
**Cambio:** Agregué y luego eliminé `console.log` para depurar el flujo de autenticación (recibo de petición, validación de clave interna, verificación de idToken, consulta a `authorized_users`, respuesta final). El archivo quedó finalmente sin logs de depuración.

### 3. `packages/client/src/app/[locale]/admin/login/page.tsx`
**Cambio:** Eliminé `window.location.href = '/admin'` del manejador de login. Este redireccionamiento forzado a `/admin` sin el segmento de idioma (`/es`) causaba que Next.js con i18n no resolviera correctamente la ruta y el usuario quedara atrapado en la página de login. Ahora el `AuthProvider` maneja la redirección después del login exitoso.

### 4. `packages/client/src/app/[locale]/AuthProvider.tsx`
**Cambio:** Corregí la lógica de redirección del `onIdTokenChanged`:
- **Antes:** Cuando el usuario se autenticaba en `/es/admin/login`, el cálculo del `target` devolvía la misma ruta (`/es/admin/login`), por lo que `window.location.pathname !== target` era `false` y **nunca redirigía**.
- **Después:** 
  - Si el usuario está autenticado y está en `/es/admin/login` → redirige a `/es/admin` (panel).
  - Si el usuario no está autenticado y está en una ruta protegida de admin que no es login → redirige a `/es/admin/login`.

## Archivos no modificados por mí (modificados por el usuario)

- `packages/functions/.env`: El usuario eliminó las comillas de `BFF_INTERNAL_KEY` y eliminó las líneas `FIREBASE_AUTH_EMULATOR_HOST`, `FIRESTORE_EMULATOR_HOST`, `FUNCTIONS_EMULATOR_HOST` para que el emulator cargara correctamente las variables de entorno.

## Estado de los gaps de MT1.2

| Gap | Estado |
|-----|--------|
| `POST /api/auth/session` → 200 + `Set-Cookie __session` | ✅ Cerrado |
| Email no sembrado → 403 `PERMISSION_DENIED` | ✅ Cerrado |
| Seed de `authorized_users` vs emulador Firestore | ✅ Cerrado |

El flujo completo funciona: login con Google en producción → `idToken` válido → verificación en Functions contra Auth de producción → verificación de lista blanca en Firestore emulator → emisión de cookie `__session` → acceso al panel `/es/admin`.

