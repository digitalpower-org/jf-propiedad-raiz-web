# docs/TASKS.md
# Roadmap de Tareas e Historias de Usuario (Spec-Driven Development)

**Proyecto:** Plataforma Web & CMS `jfpropiedadraiz.com`   
**Versión:** 1.1 · 22 de octubre de 2026   
**Arquitectura:** Monorepo (`packages/shared-types`, `packages/functions`, `packages/client`)   
**Metodología:** Spec-Driven Development con trazabilidad hacia las dos specs OpenAPI (`./openapi.backend.yaml` y `./openapi.bff.yaml`, D26) y Clean Architecture.   
**Idiomas:** el sitio público existe en español de Colombia (`es-CO`, idioma por defecto) y en inglés (`en`), bajo rutas `/es/...` y `/en/...` (US0.4). Los admins escriben en español y pueden editar el inglés a mano en el editor de inmuebles; la traducción automática ES→EN es configurable por campo en ese editor (activada por defecto) y el inglés se genera automáticamente al guardar cuando está activa (US0.5, US4.1). El panel `/admin` es solo en español (interfaz). Moneda COP, sin decimales, con formato según el idioma.  
**Cambios v1.1:** D17 alineado con AC1.10.4 y `firestore.indexes.json` (8 presets = 8 índices de presets); AC7.5.7 sin «consignaciones»; base de decisiones D1–D36.

---

## CÓMO LEER ESTE DOCUMENTO

- **Estado:** `[ ]` pendiente · `[x]` completado.  
- **Responsable:** `[ Dev 1 ]` backend (`packages/functions`) · `[ Dev 2 ]` frontend (`packages/client`) · `[ Fullstack ]` ambos.  
- **Prioridad:** `MUST` bloquea el lanzamiento · `SHOULD` se espera en la v1 · `COULD` diferible.  
- **Verificación:** `[agente]` verificable sin intervención humana (Playwright, Vitest, grep, curl) · `[manual]` requiere a una persona (consola de facturación, DNS, revisión jurídica, aprobación del propietario).  
- **`[Debe NOT]`:** criterio negativo. Si se incumple, la historia se rechaza.  
- Las historias se identifican como `USx.y` y sus criterios como `ACx.y.z`, redactados como **Dado / Cuando / Entonces**.

### Reglas transversales (aplican a todas las historias y no se repiten en cada una)

- **T1 · Textos:** ningún texto visible del sitio público está escrito en JSX. Los textos de la interfaz salen de `messages/es.json` y `messages/en.json`; el contenido que escriben los admins sale de la base de datos. `[agente]`  
- **T2 · Datos y secretos:** el repositorio no contiene secretos, teléfonos, direcciones ni correos reales. `[agente]`  
- **T3 · WhatsApp:** todo enlace de WhatsApp del sitio se construye con un único helper, `buildWhatsAppUrl` (US2.5), en `packages/client/src/lib/whatsapp.ts` (D35). `[agente]`

---

## DECISIONES DE ARQUITECTURA

| \# | Tema | Decisión |
| :---- | :---- | :---- |
| D1 | Backend | Firebase Functions (`packages/functions`). Sin contenedor `apps/api`, sin Dockerfile ni `/healthz`. |
| D2 | Acceso desde el navegador | **BFF**: rutas de Next.js de la superficie pública (`/api/*`, D31) reenvían a Functions. El navegador nunca llama a Functions directamente. El BFF valida su propia sesión (cookie) y propaga `X-User-*`; **no** valida idTokens de Firebase. Los secretos viven solo en el servidor. |
| D3 | Fotos | Cloudflare R2. Subida directa por URL presignada al prefijo `pending/` \+ paso **«confirmar subida»**: el backend valida por cabecera, genera derivados WebP y elimina el original. Sin Firebase Storage. |
| D4 | Correo | Resend. |
| D5 | Consignación | Un formulario genera un correo HTML a Juan Fernando con los datos y un enlace de WhatsApp preformateado para responder al solicitante; el solicitante recibe un correo de «Recibo». Si falla el correo a Juan, el usuario ve un aviso y un botón para enviar el mensaje por WhatsApp (acción suya). No hay notificación automática a WhatsApp. |
| D6 | Código de inmueble | `JF-XXXX` secuencial, asignado **al crear**. |
| D7 | Estados | `ACTIVE` / `HIDDEN` / `DELETED`. Sin estado de disponibilidad (vendido/alquilado). Sin `DRAFT` (ver US1.7). |
| D8 | Navegación | Pestañas independientes `/venta`, `/alquiler`, `/proyectos` y `/servicios`. Las tres primeras corresponden a un valor de `operacion`. Nosotros y Contacto se enlazan desde el footer (US5.2). |
| D9 | Filtros | La operación es fija por pestaña y el listado público exige siempre `status = ACTIVE` (el admin ve `HIDDEN` solo por su API). Se resuelven de forma nativa en Firestore: `tipo`, ubicación (`departamento` + `municipio` juntos, como un único filtro), rango de `precio` y `destacada` (un solo valor `true`/`false`, nunca ambos). El resto se filtra en el navegador sobre lo ya cargado. No hay filtro de sector (D24). |
| D10 | Servicios | Editables desde el admin, sin cantidad fija (crear, editar, ocultar, reordenar, eliminar). |
| D11 | Leads | **No existen.** Las solicitudes solo generan correos (US3.2); no se guarda, lista ni gestiona ningún dato de solicitante. |
| D12 | WhatsApp en la ficha | Un solo botón. Número desde variable de entorno. |
| D13 | Videos | Enlaces de YouTube con carga diferida (facade \+ modal). |
| D14 | Panorámicas 360° | Archivos `.jpg` en R2 visualizados con Pannellum, cargado dinámicamente y solo al abrir. |
| D15 | Forma de errores | `{ success: false, data: { code, details, requestId }, message }`. Validación \= HTTP 422 con `VALIDATION_ERROR`. |
| D16 | Hosting del frontend | Next.js en **Firebase App Hosting**, en el mismo proyecto de Firebase que Functions, Firestore y Auth. |
| D17 | Orden e índices | El listado se ordena siempre por `createdAt` descendente (más reciente primero), con desempate por `id`; como `destacada` se filtra por un único valor, las pestañas hacen dos consultas (primero `true`, después `false`) para mostrar los destacados primero. La paginación es por cursor `{ createdAt, id }` en cada consulta. Los índices compuestos cubren las 4 combinaciones de igualdad (`tipo` × ubicación) documentadas en `./ARCHITECTURE.md` y `firestore.indexes.json`; el rango de precio **no** comparte índice con el mismo preset sin precio, de modo que los 8 presets resultan de activar o no el rango y cada uno tiene su propio índice. |
| D18 | Banderas | `destacada` (manual, franja en portada; booleano ya presente en el modelo Property) y la insignia «Nuevo», que se deriva en el frontend cuando `createdAt` tiene menos de 30 días; no se persiste ninguna bandera ni existe tarea programada. |
| D19 | Listados | Scroll infinito por cursor, de 12 en 12\. Sin paginación numerada. |
| D20 | Proyectos sobre planos | Son una `operacion` propia y tienen campos propios (`proyecto`) además de los de un inmueble. |
| D21 | Panorámicas 360° | Máximo 3 por inmueble. |
| D22 | Idiomas | `es` por defecto y `en`. Rutas localizadas (US0.4). Los admins escriben en español y pueden editar el inglés; el backend traduce automáticamente al guardar los campos con traducción automática activa (US0.5), configurable por campo en el editor de inmuebles. |
| D23 | Secretos | Se usa **Secret Manager** (decisión del propietario). Los secretos no se versionan ni se escriben en texto plano en `apphosting.yaml`. |
| D24 | Ubicación | El catálogo solo discrimina hasta municipio, pero `departamento` y `municipio` se eligen **juntos** como un único filtro de ubicación (necesario para desambiguar municipios homónimos de distintos departamentos). No hay campo, catálogo ni filtro de sector; si se menciona un sector o barrio, va como texto libre dentro de `descripcion`. |
| D25 | Página Nosotros | `/nosotros` tiene la descripción amplia de la empresa y su equipo, con contenido editable desde el admin. La portada solo muestra un extracto. |
| D26 | Contratos OpenAPI | **Dos** especificaciones: `./openapi.backend.yaml` (contrato interno BFF ↔ Functions, con `X-Internal-Key` y `X-User-*`, incluido el endpoint interno de sesión `POST /internal/auth/verify`) y `./openapi.bff.yaml` (contrato público navegador ↔ BFF, con cookie de sesión). El contrato interno no se expone al navegador. |
| D27 | Validación de identidad y autorización | El **backend** valida el idToken de Firebase en login/refresh (endpoint interno, `X-Internal-Key`) y comprueba la lista blanca `authorized_users`; también **autoriza** las rutas de administrador. El **BFF** emite y valida el JWT de sesión (cookie) y propaga la identidad; no usa Firebase Admin. |
| D28 | Filtros y presets | Base fija del listado público: `status = ACTIVE` y la operación de la pestaña; `destacada` se filtra por un único valor (`true` o `false`, nunca ambos). Filtros opcionales: rango de `precio` (2), `tipo` de inmueble (3) y ubicación `departamento`+`municipio` (4). Los 8 presets son `1, 1+2, 1+3, 1+4, 1+2+3, 1+2+4, 1+3+4, 1+2+3+4`. La portada pide `destacada=true`; las pestañas piden primero `true` y después `false`. |
| D29 | Revocación de sesión | No se exige invalidación inmediata al deshabilitar un administrador: se acepta la ventana de hasta 65 min del JWT del BFF. |
| D30 | Plano interno del backend | Las operaciones **entre planos** —la verificación de sesión— viven bajo el prefijo `/internal/*`, **sin versionar** y **nunca alcanzables desde el navegador**; `/api/v1/*` queda reservado a los recursos de dominio, que siempre reciben la identidad propagada (`X-User-*`). El prefijo `/internal/` es una **garantía**, no una convención: el BFF no expone ninguna ruta que lo atraviese (D26), ninguna ruta de dominio se declara bajo `/internal/*` y el catálogo público (D31) no contiene ninguna entrada que lo alcance. |
| D31 | Superficie pública del BFF | La superficie pública del BFF son **rutas explícitas** bajo `/api/*` (sin el segmento `/bff/` y sin *catch-all*): cada operación tiene su propio route handler, de modo que el router de Next.js **es** la allowlist y lo no declarado no existe (*fail-closed*). El mapeo ruta pública ↔ ruta interna y la política de sesión —qué rutas exigen cookie de sesión— viven en un **único módulo**, `packages/client/src/server/routes.ts`, **generado** desde `./openapi.bff.yaml` (script `gen:routes`, AC0.1.8): la spec es la fuente y el catálogo se deriva de ella, así que no pueden divergir. Las excepciones a la convención `/api/<x>` → `/api/v1/<x>` se declaran en la propia operación con `x-bff-internal-path` (ruta interna literal, o `null` si la ruta se resuelve en el BFF). |
| D32 | Autoridad de autenticación del BFF | La cookie de sesión se valida en el **route handler**, no en el Proxy: cada handler se declara con un envoltorio que consulta el catálogo `routes.ts` (D31) y aplica la política de su ruta — `public` no lee la cookie ni adjunta identidad; `session` exige cookie válida (firma + `exp`, AC1.2.8) y entrega `{ sub, email, role }`; `internal` exige `X-Internal-Key`. El Proxy solo cierra la superficie (404/405, AC0.1.6) y **no** autentica. La identidad reenviada se **construye desde el JWT verificado**: el envoltorio descarta cualquier `X-User-*` y `X-Internal-Key` de la petición entrante y reescribe las `X-User-*` (AC1.3.5). El `X-Internal-Key` es el **mismo secreto** en ambos sentidos: entrante en `POST /api/revalidate` y saliente hacia Functions. Así la corrección no depende del `matcher` del Proxy y cada handler es defendible y testeable por sí mismo. La profundidad de la validación del JWT (claims, tolerancia de reloj, rotación del secreto) se fija en D34 dentro de `verifySession()`, sin cambiar esta decisión. |
| D33 | Nombre de la cookie de sesión | La cookie del BFF se llama **`__session`**. Es la convención que Firebase documenta para la cookie de sesión y el único nombre que Firebase Hosting reenvía a las Functions; el prefijo `__` la separa de cualquier cookie de aplicación. Atributos: `HttpOnly; Secure; SameSite=Strict; Path=/` y sin `Domain` (AC1.2.1). El nombre literal vive en `openapi.bff.yaml` (`securitySchemes.session.name`); el **identificador** del esquema sigue siendo `session`, que es lo que lee el catálogo `routes.ts` (AC0.1.8). |
| D34 | Vigencia del JWT de sesión | «Vigente» significa: firma **HS256** válida (comparación en tiempo constante, `alg` fijado y rechazo de `none`/otros algoritmos), `iss = "jf-bff"`, `aud = "jf-web"`, `sub`/`email`/`role` presentes y con tipo correcto, `iat ≤ now + 60 s`, `exp ≥ now − 60 s`, `iat ≤ exp` y `exp − iat = 3900 s` (65 min; se rechaza un TTL mayor). Sin `nbf` (si aparece, se ignora). **No hay ventana absoluta**: cada re-emisión renueva 65 min mientras el idToken de Firebase siga siendo válido. **No hay denylist ni `jti`** (D29): un token copiado vive hasta su `exp` aunque se haga logout, que solo borra la cookie del navegador. Todo fallo → **401 `UNAUTHORIZED`** con la misma forma, sin revelar el motivo; se registra `requestId` y el motivo interno, nunca el token. Se rechaza una petición que traiga más de un valor de `__session`. Rotación del secreto con solape ≥ 65 min (`SESSION_JWT_SECRET_PREVIOUS`), sin `kid`. La política vive en `packages/client/src/server/session/jwt.ts` (`signSession`/`verifySession`) con `TTL`, `SKEW`, `ISS` y `AUD` como constantes únicas. |
| D35 | Ubicación de `buildWhatsAppUrl` | El helper de WhatsApp (T3, AC2.5.4) vive en **`packages/client/src/lib/whatsapp.ts`**, no en `shared-types`: es código de runtime y `shared-types` es un paquete **sin código ejecutable** (solo `.d.ts` y datos JSON de solo lectura; sin `main`/`exports` de runtime). La función es **pura** —recibe `{ number, message, isMobile }` y devuelve la URL— para poder probarla y reutilizarla; la detección de móvil ocurre en el manejador del clic, en el cliente (AC2.5.4). El BFF puede importarla (es el mismo paquete `client`); `functions` no la necesita y sigue consumiendo `@jf/shared-types` solo con `import type` por `tsconfig paths`, lo que evita el TS6059 por archivos fuera de su `rootDir`. |
| D36 | Implementación de i18n (US0.4) | `next-intl` **4.14.9** (exacta) en `@jf/client`, **sin middleware**: el Proxy sigue reservado por D32 para la superficie de `/api`, y el idioma se resuelve por el segmento `[locale]`. Las rutas localizadas viven en `src/i18n/routes.ts` (`getRoute`/`parsePath`/`getEquivalentPath`, slug y query preservados); los diccionarios son `messages/{es,en}.json` con un test de paridad de claves (AC0.4.4). `/` se resuelve en `app/route.ts` (307 según `Accept-Language`, `es` por defecto) y `dynamicParams = false` devuelve 404 para idiomas no soportados (AC0.4.2). El diccionario se carga con un `import()` por idioma detrás de `server-only` (`src/i18n/messages.ts`), de modo que al navegador solo llega el idioma activo (AC7.2.4). `setRequestLocale` se llama en **cada layout y cada página** porque Next 16 los renderiza en paralelo. Zona horaria de formato: `America/Bogota`. |

---

## MODELO DE DATOS MÍNIMO (referencia para `shared-types`)

- **Translatable:** `{ es: string, en?: string, autoTranslate?: boolean, enPendiente?: boolean }`. `es` lo escribe el admin; `en` lo escribe el sistema con la traducción automática (US0.5) o el admin manualmente; `autoTranslate` (por campo, activo por defecto) controla si el backend traduce al guardar; `enPendiente` lo mantiene el backend (regla de estado en US0.5).  
- **Property:** `id`, `codigo` (`JF-XXXX`), `slug`, `status` (`ACTIVE|HIDDEN|DELETED`), `operacion` (`VENTA|ALQUILER|PROYECTO_SOBRE_PLANOS`), `tipo` (`CASA|APARTAMENTO|LOTE_CAMPESTRE|LOTE_URBANO|FINCA|LOCAL_COMERCIAL|BODEGA|OFICINA`), `titulo` (Translatable), `descripcion` (Translatable; aquí va, como texto libre, cualquier mención de sector o barrio), `precio` (COP, entero; valor de venta o canon mensual), `departamento`, `municipio`, `estrato`, `predial`, `administracion`, `acabados` (Translatable), `antiguedad`, `areaConstruida`, `areaLote`, `dormitorios`, `banos`, `parqueaderos`, `deposito` (cuarto útil), `amenidades[]` (catálogo cerrado en `shared-types`, p. ej. `PISCINA`, `CANCHA`, `GIMNASIO`), `puntosInteres[]` (categoría predefinida o ítem personalizado con etiqueta Translatable), `fotos[]` (orden \= posición; posición 1 \= portada; cada una con las claves de sus derivados), `videos[]` (máx. 2 URLs de YouTube), `panoramas[]` (JPG en R2, máx. 3), `destacada` (boolean), `proyecto?` (solo si `operacion = PROYECTO_SOBRE_PLANOS`: `etapa` (Translatable), `fechaEntregaEstimada` (`AAAA-MM`), `unidadesDisponibles`), `fechaPublicacion`, `createdAt`, `updatedAt`.  
- **Service:** `id`, `slug`, `status` (`ACTIVE|HIDDEN|DELETED`), `titulo`, `resumen`, `cuerpo` (los tres Translatable), `fotos[]`, `orden`, `updatedAt`.  
- **About** (documento único `pages/nosotros`): `titulo` (Translatable), `extracto` (Translatable, máx. 500 caracteres; es lo que se muestra en la portada), `secciones[]` (`id`, `titulo` (Translatable), `cuerpo` (Translatable); orden \= posición), `equipo[]` (`id`, `nombre`, `cargo` (Translatable), `descripcion?` (Translatable), `foto?`; orden \= posición), `updatedAt`.  
- No existe la entidad Lead (D11).

---

## ÉPICA 0: Fundamentos Transversales

### US0.1 — Contrato de API, Respuesta Estándar y Catálogo de Códigos de Error

- **Responsable:** \[ Dev 1 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** definir en las dos specs OpenAPI (`./openapi.backend.yaml` y `./openapi.bff.yaml`, D26) y `shared-types` la envoltura de respuestas y el catálogo de códigos.  
- **Criterios de aceptación:**  
  - AC0.1.1 **Dado** cualquier endpoint exitoso **Entonces** el cuerpo es `{ success: true, data, message }`. `[agente]`  
  - AC0.1.2 **Dado** cualquier error **Entonces** el cuerpo es `{ success: false, data: { code, details, requestId }, message }` y el `requestId` también se registra en logs. `[agente]`  
  - AC0.1.3 **Dado** el catálogo de códigos **Entonces** existe una única tabla en `shared-types` con estos pares: `VALIDATION_ERROR` 422 · `CONSENT_REQUIRED` 422 · `UNSUPPORTED_MEDIA` 422 · `IMAGE_TOO_LARGE` 422 · `IMAGE_TOO_SMALL` 422 · `UNAUTHORIZED` 401 · `PERMISSION_DENIED` 403 · `NOT_FOUND` 404 · `PROPERTY_NOT_FOUND` 404 · `SERVICE_NOT_FOUND` 404 · `METHOD_NOT_ALLOWED` 405 · `CONFLICT` 409 · `RATE_LIMITED` 429 · `EMAIL_DELIVERY_FAILED` 502 · `INTERNAL` 500\. La tabla vive en `packages/shared-types/errors.json` (única fuente runtime, compartida por el BFF y el navegador) y su unión de tipos en `packages/shared-types/src/errors.d.ts`; la compilación falla si las dos divergen. `[agente]`  
  - AC0.1.4 **Dado** un error de validación **Entonces** el estado es 422 (no 400\) y `details` lista los campos con su mensaje. `[agente]`  
  - AC0.1.5 **\[Debe NOT\]** Ningún mensaje de error expone trazas, rutas internas ni datos personales. `[agente]`
  - AC0.1.6 **Dado** una petición a una ruta no declarada en el catálogo **Entonces** el BFF responde 404 `NOT_FOUND` con la envoltura estándar; a un método no permitido en una ruta declarada, 405 `METHOD_NOT_ALLOWED` con la envoltura y la cabecera `Allow`. Nunca HTML ni un cuerpo vacío. `[agente]`  
  - AC0.1.7 **Dado** cualquier respuesta del BFF **Cuando** la consume el navegador **Entonces** el cliente HTTP la normaliza a la envoltura de éxito o a un error con `code`, `status` y `requestId`; una respuesta fuera de contrato (HTML, cuerpo vacío, JSON inválido) se reporta como `INTERNAL` sin filtrar el cuerpo crudo, y un fallo de red se reporta con `status: 0`. `[agente]`  
  - AC0.1.8 **Dado** el catálogo de rutas del BFF **Entonces** `packages/client/src/server/routes.ts` se **genera** desde `./openapi.bff.yaml` (script `gen:routes`) y coincide operación a operación con la spec en método, ruta y política de sesión; toda operación reenviada apunta a una operación existente de `./openapi.backend.yaml` con el mismo método, y existe **biyección** entre operaciones reenviadas y operaciones del contrato interno. El fichero generado se versiona y `npm run gen:routes:check -w @jf/client` falla si queda desactualizado. `[agente]`  

### US0.2 — BFF de Next.js y Seguridad de la Llamada al Backend

- **Responsable:** \[ Dev 1 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** rutas de servidor en Next.js que reenvían al backend con la clave interna y la identidad de la sesión. TanStack Query consume solo el BFF.  
- **Criterios de aceptación:**  
  - AC0.2.1 **Dado** una petición del navegador **Cuando** consume datos **Entonces** llama a una ruta de la superficie pública del BFF (`/api/*`, D31) y no a la URL de Functions. `[agente]`  
  - AC0.2.2 **Dado** una petición del BFF a Functions **Entonces** incluye `X-Internal-Key` desde una variable de entorno de servidor. `[agente]`  
  - AC0.2.3 **Dado** una petición a Functions sin `X-Internal-Key` o con una incorrecta **Entonces** responde 401 `UNAUTHORIZED` (comparación en tiempo constante). `[agente]`  
  - AC0.2.4 **Dado** una ruta de escritura con `X-Internal-Key` válida **Cuando** el BFF no adjunta identidad (`X-User-*`) **Entonces** responde 401; con identidad (`X-User-Role: admin`) responde 200. `[agente]`  
  - AC0.2.5 **Dado** una petición pública **Entonces** el BFF reenvía la IP del visitante en `X-Client-IP` y Functions solo la acepta si la clave interna es válida (la usa el límite de envíos, US3.4). `[agente]`  
  - AC0.2.6 **\[Debe NOT\]** La clave no aparece en ningún chunk del cliente ni en logs, y Functions no emite `Access-Control-Allow-Origin`. `[agente]`  
  - AC0.2.7 **Dado** una petición `GET /api/about` **Entonces** el BFF la reenvía a `GET /api/v1/about` con `X-Internal-Key` y responde 200 con el documento único `pages/nosotros` en la envoltura estándar; la ruta es pública (sin sesión) y alimenta el bloque «Nosotros» de la portada (AC2.6.4) y la página `/nosotros` (AC5.6.1). `[agente]`  
- **Superficie pública (D31):** las rutas del BFF que el navegador puede llamar están enumeradas una a una en `./openapi.bff.yaml` (`paths`), sin *catch-all*: el router de Next.js es la allowlist. La política de sesión (qué rutas exigen cookie) y el mapeo a la ruta interna **se derivan de esa misma spec** hacia `packages/client/src/server/routes.ts` (generado, AC0.1.8); las excepciones a la convención se marcan con `x-bff-internal-path`.  
- **Cierre de la superficie por el Proxy (AC0.1.6):** `packages/client/src/proxy.ts` aplica esa allowlist **antes** del router de Next.js, así que el BFF nunca devuelve la respuesta cruda de Next (HTML en el 404, cuerpo vacío en el 405) sino la envoltura estándar. La resolución del path es *path-first* como en el router de Next.js: gana el segmento literal sobre el dinámico y el método se comprueba después sobre el patrón resuelto, de modo que `PUT /api/properties/featured` es un 405 y no se cuela por `/api/properties/{idOrSlug}`.  
- **Lectura pública de «Nosotros» (AC0.2.7):** el contrato interno expone `GET /api/v1/about` y el BFF `GET /api/about` (público, sin sesión), que sirven el documento único `pages/nosotros`. Lo consumen el bloque «Nosotros» de la portada (AC2.6.4, solo el `extracto`) y la página `/nosotros` (AC5.6.1). El catálogo generado (AC0.1.8) incorpora la ruta sin configuración extra: la convención `/api/<x>` → `/api/v1/<x>` la mapea sola.  

### US0.3 — Revalidación Bajo Demanda

- **Responsable:** \[ Fullstack \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** tras cada escritura, el backend avisa a Next.js para refrescar las páginas públicas sin reconstruir el sitio. En cada guardado el orden es: validar → traducir (US0.5) → escribir → revalidar.  
- **Criterios de aceptación:**  
  - AC0.3.1 **Dado** que se crea, edita, activa, oculta o elimina un inmueble o servicio, o que se guarda la página Nosotros **Cuando** se confirma la escritura **Entonces** Functions invoca `POST /api/revalidate` con un secreto y se ejecuta `revalidatePath`/`revalidateTag` de las rutas afectadas **en ambos idiomas** (listados, ficha, portada, servicios, nosotros y sitemap). `[agente]`  
  - AC0.3.2 **Dado** un inmueble activado **Entonces** aparece en su listado y en su ficha sin ejecutar `next build`. `[agente]`  
  - AC0.3.3 **Dado** una llamada a `/api/revalidate` sin el secreto **Entonces** responde 401\. `[agente]`  
  - AC0.3.4 **\[Debe NOT\]** Si la revalidación falla, la escritura ya hecha no se revierte; se registra el fallo. `[agente]`

### US0.4 — Internacionalización por Rutas (es / en)

- **Responsable:** \[ Fullstack \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** todas las rutas públicas existen en español e inglés con segmento de idioma y rutas traducidas. La estructura se construye desde el inicio porque cambiarla después reescribe todas las rutas. El panel `/admin` y `/api/**` no se localizan. El contenido en inglés lo produce US0.5 (traducción automática por campo) o la edición manual del admin.

| Página | `es` | `en` |
| :---- | :---- | :---- |
| Portada | `/es` | `/en` |
| Venta | `/es/venta` | `/en/sale` |
| Alquiler | `/es/alquiler` | `/en/rent` |
| Proyectos | `/es/proyectos` | `/en/projects` |
| Servicios (índice y detalle) | `/es/servicios`, `/es/servicios/[slug]` | `/en/services`, `/en/services/[slug]` |
| Nosotros | `/es/nosotros` | `/en/about-us` |
| Ficha de inmueble | `/es/propiedad/[slug]` | `/en/property/[slug]` |
| Consigne su propiedad | `/es/consigne-su-propiedad` | `/en/list-your-property` |
| Contacto | `/es/contacto` | `/en/contact` |
| Aviso de privacidad | `/es/aviso-de-privacidad` | `/en/privacy-notice` |
| Política de tratamiento de datos | `/es/politica-de-tratamiento-de-datos` | `/en/data-processing-policy` |
| Términos | `/es/terminos` | `/en/terms` |

- **Criterios de aceptación:**  
  - AC0.4.1 **Dado** cualquier ruta pública **Entonces** existe en ambos idiomas según la tabla, definida en un único archivo de rutas (`src/i18n/routes.ts`). `[agente]`  
  - AC0.4.2 **Dado** `/` sin prefijo **Entonces** redirige a `/es` o `/en` según `Accept-Language`, con `es` por defecto; un idioma no soportado (`/fr/...`) responde 404\. `[agente]`  
  - AC0.4.3 **Dado** el selector de idioma (header y footer) **Cuando** lo uso **Entonces** llego a la ruta equivalente conservando el `slug` y los parámetros de filtros. `[agente]`  
  - AC0.4.4 **Dado** `messages/es.json` y `messages/en.json` **Entonces** tienen exactamente las mismas claves (una prueba falla si falta alguna). `[agente]`  
  - AC0.4.5 **Dado** un campo `Translatable` con `en` vacío (traducción pendiente, fallida o con traducción automática desactivada, US0.5) **Entonces** la página en inglés muestra el texto en español. **Dado** que un inmueble, servicio o la página Nosotros no tiene `en` en todos sus campos obligatorios (inmueble: `titulo` y `descripcion`; servicio: `titulo`, `resumen` y `cuerpo`; Nosotros: `titulo`) **Entonces** su página en inglés lleva `noindex` y no aparece en el sitemap `en`. `[agente]`  
  - AC0.4.6 **Dado** valores de catálogo (`tipo`, `operacion`, `amenidades`, categorías de puntos de interés) **Entonces** se traducen con los diccionarios y no se guardan traducidos. `[agente]`  
  - AC0.4.7 **Dado** un inmueble o servicio **Entonces** su `slug` se genera del título en español \+ Código de inmueble (asegurando que todo el string sea aceptable como parte de la url) y es el mismo en ambos idiomas. `[agente]`  
  - AC0.4.8 **Dado** un precio **Entonces** se muestra siempre en COP, sin decimales, con separadores según el idioma (`es-CO` / `en`); no hay conversión de moneda. `[agente]`  
  - AC0.4.9 **\[Debe NOT\]** No se llama al servicio de traducción en una petición pública, no se localiza `/admin` y las rutas `/api/**` no llevan prefijo de idioma. `[agente]`

### US0.5 — Traducción del Contenido (ES → EN), Selectiva por Campo

- **Responsable:** \[ Dev 1 \] · **Prioridad:** SHOULD · **Estado:** \[ \]  
- **Descripción:** el admin escribe en español y puede editar el inglés. Cada campo traducible lleva `autoTranslate` (activo por defecto). Al guardar, el backend traduce al inglés SOLO los campos con `autoTranslate` activo cuyo `es` cambió o cuyo `en` está vacío, en una única llamada por lote. Los campos con `autoTranslate` inactivo no se traducen y conservan su `en` (el admin los corrige a mano). El proveedor se oculta detrás de un puerto `Translator` (mismo enfoque que `ImageProcessor`): **Google Cloud Translation**.  
  - **Campos traducibles:** inmueble: `titulo`, `descripcion`, `acabados`, etiquetas de puntos de interés personalizados y `proyecto.etapa`. Servicio: `titulo`, `resumen`, `cuerpo`. Nosotros: `titulo`, `extracto`, `secciones[].titulo`, `secciones[].cuerpo`, `equipo[].cargo`, `equipo[].descripcion`.  
  - **No se traducen:** nombres de personas, departamento y municipio, ni los textos de la interfaz (esos van en `messages/*.json`).  
- **Criterios de aceptación:**  
  - AC0.5.1 **Dado** que un admin guarda un inmueble, un servicio o la página Nosotros **Cuando** un campo traducible tiene `autoTranslate` activo y un `es` nuevo o modificado, o su `en` está vacío **Entonces** el backend traduce solo esos campos (ES → EN) en una única llamada por lote, antes de escribir, y guarda `es` y `en` en la misma escritura. `[agente]`  
  - AC0.5.2 **Dado** un campo cuyo `es` no cambió y que ya tiene `en` **Entonces** no se vuelve a traducir (control de costo). `[agente]`  
  - AC0.5.3 **Dado** un campo cuyo `es` se vacía **Entonces** su `en` también se vacía. `[agente]`  
  - AC0.5.4 **Dado** una petición de escritura de admin que incluye un valor de `en` **Entonces** el backend lo persiste, limpia `enPendiente` del campo y lo marca como «Actualizada»; las peticiones públicas nunca escriben `en`. `[agente]`  
  - AC0.5.5 **Dado** que el servicio de traducción falla o tarda más de 10 s **Entonces** el guardado en español se completa igualmente, los campos afectados (con `autoTranslate` activo) quedan «Pendiente» con `en` vacío (nunca con una traducción desactualizada), la respuesta indica `traduccionPendiente: true` y el fallo se registra con su `requestId`. `[agente]`  
  - AC0.5.6 **Dado** un documento con campos «Pendiente» **Cuando** el admin pulsa «Reintentar traducción» en el editor o vuelve a guardar **Entonces** se intentan traducir únicamente los campos «Pendiente» que tengan `autoTranslate` activo. `[agente]`  
  - AC0.5.7 **Dado** la traducción **Entonces** se envía como texto plano (sin HTML) y se conservan los saltos de línea y párrafos. `[agente]`  
  - AC0.5.8 **Dado** el puerto `Translator` **Entonces** vive en dominio o aplicación, el proveedor se implementa en infraestructura, ningún módulo fuera de infraestructura importa el SDK del proveedor, y los casos de uso se prueban con un `Translator` falso. `[agente]`  
  - AC0.5.9 **Dado** el desarrollo local, las pruebas y el seed **Entonces** el sistema funciona con un traductor falso, elegido por variable de entorno, sin credenciales ni costo. `[agente]`  
  - AC0.5.10 **\[Debe NOT\]** No se traduce en peticiones públicas ni desde el navegador, la credencial del proveedor no sale del backend, y `autoTranslate` y `enPendiente` solo los escribe el backend (el admin no los envía directamente en el DTO). `[agente]`  
  - AC0.5.11 **Dado** un campo traducible **Entonces** su estado es «Actualizada» cuando `en` está relleno y `enPendiente` es falso, y «Pendiente» en el resto de los casos; **dado** que el admin modifica el `es` de un campo con `autoTranslate` inactivo **Cuando** guarda **Entonces** el backend conserva el `en` anterior, marca el campo «Pendiente» (`enPendiente = true`) y la página en inglés puede mostrar el texto anterior hasta que el admin lo corrija. `[agente]`  
  - AC0.5.12 **Dado** que el admin edita el `en` de un campo y guarda **Entonces** ese valor se persiste tal cual (sin pasar por el traductor), el campo queda «Actualizada» y no se vuelve a traducir hasta que su `es` cambie con `autoTranslate` activo. `[agente]`

---

## ÉPICA 1: Autenticación, Seguridad y Dominio Backend (`packages/functions`)

### US1.1 — Control de Acceso por Lista Blanca (verificada por el backend)

- **Responsable:** \[ Dev 1 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** la autorización se resuelve con una **lista blanca** en la colección `authorized_users` de Firestore (`email`, `role`, `active`, `createdAt`). Firebase Auth solo aporta la identidad (Google); **no** se usan blocking functions (requieren Identity Platform/Blaze). El **backend** verifica el idToken y consulta la lista blanca (a petición del BFF, US1.2) y de ella toma el rol. Quitar a un admin = `active = false`; el corte surte efecto al expirar la cookie vigente (≤ 65 min; no se exige invalidación inmediata).  
- **Criterios de aceptación:**  
  - AC1.1.1 **Dado** un correo que no está en la lista blanca **Cuando** completa el login con Google **Entonces** el backend deniega y el BFF responde 403 `PERMISSION_DENIED` en `POST /api/auth/session` sin emitir cookie. `[agente]`  
  - AC1.1.2 **Dado** un correo presente en `authorized_users` con `active = true` **Cuando** inicia sesión con Google por primera vez **Entonces** el backend autoriza y el BFF emite la sesión con normalidad. `[agente]`  
  - AC1.1.3 **Dado** un correo ausente en `authorized_users` o con `active = false` **Cuando** intenta iniciar sesión **Entonces** el backend deniega y el BFF responde 403 `PERMISSION_DENIED` sin emitir cookie. `[agente]`  
  - AC1.1.4 **Dado** un inicio de sesión válido **Entonces** no se inyecta ningún custom claim en Firebase Auth; el rol lo resuelve el backend desde la lista blanca y el BFF lo incluye al emitir su sesión (US1.2). `[agente]`
  - AC1.1.5 **Dado** el control de acceso **Entonces** la verificación de la lista blanca vive en el **backend** (`packages/functions/**`), no en Firebase Auth ni en el BFF. `[agente]`
  - AC1.1.6 **Dado** un login rechazado por la lista blanca **Entonces** no se emite cookie y el usuario ve un aviso de «Acceso denegado». `[agente]`
  - AC1.1.7 **Dado** un rechazo de la lista blanca **Entonces** se loguea con `uid`/`email` del intento y **nunca** con tokens completos. `[agente]`
  - AC1.1.8 **\[Debe NOT\]** No hay inicio de sesión con correo y contraseña ni registro público, no se usan blocking functions y la lista de administradores **no** vive en una variable de entorno ni en Firebase Auth (vive en `authorized_users`). `[agente]`

### US1.2 — BFF: POST /api/auth/session (Canje de idToken por Sesión Propia)

- **Descripción:** el BFF recibe el idToken de Firebase una sola vez y lo **reenvía al backend** por el endpoint interno (`X-Internal-Key`); el backend lo verifica y comprueba la lista blanca `authorized_users`, y devuelve la identidad. Con esa confirmación, el BFF emite la cookie `__session` (HttpOnly) con un JWT propio. Rutas sugeridas: `packages/client/src/app/api/auth/session/route.ts` (+ `server/session/jwt.ts`); la verificación vive en el backend (`packages/functions/**`).

- **Responsable:** \[ Dev 1 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Criterios de aceptación:**  
  - AC1.2.1 **Dado** `POST /api/auth/session` con `Authorization: Bearer <idToken>` **Cuando** el idToken es válido **Entonces** el BFF responde 200 y establece la cookie `__session` (`HttpOnly; Secure; SameSite=Strict; Path=/`) con un JWT propio `{ sub, email, role, iss: "jf-bff", aud: "jf-web", iat, exp }`, con `iat`/`exp` en segundos y `exp − iat = 3900 s` (D34). `[agente]`  
  - AC1.2.2 **Dado** un idToken inválido, expirado o revocado **Cuando** el backend lo verifica **Entonces** el BFF responde 401 `UNAUTHORIZED` y no establece cookie. `[agente]`  
  - AC1.2.3 **Dado** el idToken recibido **Entonces** el BFF lo reenvía al backend (endpoint interno con `X-Internal-Key`) y es el **backend** quien lo verifica con Firebase Admin (`verifyIdToken(idToken, true)`) y comprueba que su `email` esté en `authorized_users` con `active = true` antes de que el BFF emita la sesión. `[agente]`  
  - AC1.2.4 **Dado** el JWT emitido **Entonces** se firma con `HS256` usando un secreto de servidor (variable de entorno) que nunca llega al cliente. `[agente]`  
  - AC1.2.5 **Dado** que la respuesta sale del BFF **Entonces** la cookie no es legible por JavaScript (`HttpOnly`) y no contiene el idToken ni el refresh token de Firebase. `[agente]`
  - AC1.2.6 **Dado** el `Authorization: Bearer` **Entonces** el idToken **no** se persiste en `localStorage` ni en cookies; vive solo en memoria durante el canje. `[agente]`
  - AC1.2.7 **Dado** el rol de la sesión **Entonces** lo resuelve el **backend** desde el campo `role` de `authorized_users` y el BFF lo incluye en el JWT; en la v1 su valor es siempre `admin` (no se distinguen otros roles). `[agente]`  
  - AC1.2.8 **Dado** la sesión emitida **Entonces** es stateless: no se guarda estado de sesión en el servidor y la validez se comprueba con las comprobaciones de D34 (AC1.3.8), sin consultar Firestore ni ninguna denylist. `[agente]`
  - AC1.2.9 **\[Debe NOT\]** El BFF no lee ni escribe la lista blanca (`authorized_users` vive en el backend) ni registra sesiones en Firestore; tampoco expone ningún endpoint de registro. `[agente]`
  - AC1.2.10 **Dado** el JWT emitido **Entonces** incluye `iss: "jf-bff"`, `aud: "jf-web"`, `sub`, `email`, `role`, `iat` y `exp` en segundos, con `exp − iat = 3900 s` y sin `nbf`; emisión y verificación comparten las constantes `TTL`, `SKEW`, `ISS` y `AUD` de `server/session/jwt.ts` (D34). `[agente]`

### US1.3 — BFF: Guard de Sesión y Propagación de Identidad al Backend

- **Responsable:** \[ Dev 1 \] · **Prioridad:** MUST · **Estado:** \[ \]
- **Descripción:** envoltorio de los route handlers del BFF que aplica la política de sesión del catálogo `packages/client/src/server/routes.ts` (D31, D32): valida el JWT propio de la cookie en las rutas `session`, exige `X-Internal-Key` en las `internal` y propaga la identidad al backend en cabeceras `X-User-*`. El Proxy solo cierra la superficie (404/405) y **no** autentica. El **backend** es quien autoriza las rutas de administrador a partir de `X-User-Role`. Complementa US0.2, que fija la `X-Internal-Key`.
- **Criterios de aceptación:**
  - AC1.3.1 **Dado** una ruta de la superficie pública que exige sesión (D31) **Cuando** no hay cookie o es inválida o expirada **Entonces** el BFF responde 401 `UNAUTHORIZED` sin llamar al backend. Qué rutas exigen sesión lo decide el catálogo `packages/client/src/server/routes.ts`, y la comprobación la ejecuta el **envoltorio del route handler** antes de su lógica (D32), no el Proxy; toda ruta `session` del catálogo pasa por el envoltorio (test de conformidad que recorre `ROUTES`). El BFF **no** decide autorización de negocio, que es del backend a partir de `X-User-Role` (D27). `[agente]`
  - AC1.3.2 **Dado** una cookie válida **Entonces** el envoltorio valida firma, claims y tiempos según D34 (AC1.3.8), deriva `{ sub, email, role }` de los claims verificados y reenvía al backend añadiendo `X-User-Id`, `X-User-Email` y `X-User-Role: admin` (además de la `X-Internal-Key` de US0.2); los valores provienen del JWT, nunca de la petición entrante. `[agente]`
  - AC1.3.3 **Dado** el backend **Entonces** construye su `authContext` a partir de `X-User-*` en `presentation/middlewares/auth.middleware.ts` y **autoriza** las rutas de administrador con `role.middleware.ts` (`X-User-Role: admin`); solo valida idTokens de Firebase en el endpoint interno de sesión. `[agente]`
  - AC1.3.4 **Dado** que el navegador intenta llamar a Functions directamente **Entonces** la petición falla (sin `X-Internal-Key` válida responde 401). `[agente]`
  - AC1.3.5 **\[Debe NOT\]** El BFF no confía en cabeceras `X-User-*` ni en un `X-Internal-Key` que vengan del cliente: el envoltorio las descarta y reescribe las `X-User-*` con los datos de la sesión verificada; la `X-Internal-Key` saliente sale siempre del entorno del servidor. `[agente]`
  - AC1.3.6 **Dado** `POST /api/revalidate` **Cuando** falta la `X-Internal-Key` o no coincide **Entonces** el BFF responde 401 sin leer la cookie ni llamar al backend; con la clave válida ejecuta la ruta. La clave entrante es el **mismo** secreto que el BFF usa saliente hacia Functions (D32). `[agente]`
  - AC1.3.7 **Dado** una respuesta de una ruta `session` **Entonces** lleva `Cache-Control: no-store` y no se sirve desde ninguna caché compartida (CDN/ISR); las rutas `public` conservan su política de caché. `[agente]`
  - AC1.3.8 **Dado** una cookie `__session` **Cuando** el envoltorio la verifica **Entonces** aplica en orden: (1) un único valor de cookie, (2) tamaño ≤ 4 KB, (3) JWT bien formado con `alg` exactamente `HS256`, (4) firma válida en tiempo constante, (5) `iss`/`aud` esperados, (6) `sub`/`email`/`role` presentes y `string` no vacío, con `iat`/`exp` numéricos, (7) `iat ≤ now + 60 s`, (8) `exp ≥ now − 60 s`, (9) `iat ≤ exp` y `exp − iat = 3900 s`; cualquier fallo → **401 `UNAUTHORIZED`** sin distinguir el motivo (D34). El BFF no compara `role` con `admin`: eso es autorización del backend (D27). `[agente]`

### US1.4 — BFF: POST /api/auth/logout (Cierre de Sesión Bidireccional)

- **Responsable:** \[ Fullstack \] · **Prioridad:** MUST · **Estado:** \[ \]
- **Descripción:** el logout limpia la sesión de Firebase en el cliente y borra la cookie del BFF; ambos pasos son obligatorios.
- **Criterios de aceptación:**
  - AC1.4.1 **Dado** `POST /api/auth/logout` **Entonces** el BFF borra la cookie `__session` (`Max-Age=0`, mismo `Path`/`Domain`/`Secure`/`SameSite`) y responde 204. `[agente]`
  - AC1.4.2 **Dado** el flujo de logout **Entonces** el cliente ejecuta `signOut(auth)` (Firebase limpia su refresh token) y llama a `POST /api/auth/logout`. `[agente]`
  - AC1.4.3 **Dado** que solo se hace `signOut()` sin llamar al BFF **Entonces** el navegador seguiría enviando la cookie antigua hasta su expiración (comportamiento prohibido). `[agente]`
  - AC1.4.4 **Dado** un logout exitoso **Entonces** el front redirige a la home pública (`/`). `[agente]`
  - AC1.4.5 **\[Debe NOT\]** No existe un logout solo en cliente que deje la cookie viva. `[agente]`

### US1.5 — Front: Ciclo de Sesión, Renovación y Protección de `/admin`

- **Responsable:** \[ Dev 2 \] · **Prioridad:** MUST · **Estado:** \[ \]
- **Descripción:** el cliente gestiona la sesión con el SDK de Firebase (`onAuthStateChanged`, `onIdTokenChanged`, `signInWithPopup`, `signOut`) y renueva la cookie del BFF. Las rutas `/admin/**` están protegidas.
- **Criterios de aceptación:**
  - AC1.5.1 **Dado** `/admin/**` sin sesión **Cuando** entro **Entonces** se redirige a `/admin/login` y nunca se sirve HTML de admin con 200. `[agente]`
  - AC1.5.2 **Dado** un login con Google válido **Cuando** el front obtiene el idToken **Entonces** llama a `POST /api/auth/session` y, al recibir 200, aterriza en `/admin`. `[agente]`
  - AC1.5.3 **Dado** el idToken tras el canje **Entonces** el front blanquea la variable en memoria y **no** llama `signOut()` ni limpia la persistencia del SDK (necesaria para el refresh). `[agente]`
  - AC1.5.4 **Dado** un 401 del BFF (cookie expirada) **Entonces** el front obtiene un idToken vigente (`getIdToken()`) y repite `POST /api/auth/session` (renovación reactiva), con **un único intento (single-flight)**: las demás peticiones concurrentes esperan a que esa renovación termine, sin lanzar llamadas paralelas; **si la renovación falla, aplica AC5.4.7.** `[agente]`
  - AC1.5.5 **Dado** `onIdTokenChanged` **Entonces** el front re-sincroniza la sesión del BFF (~cada hora) sin intervención del usuario. `[agente]`
  - AC1.5.6 **Dado** un usuario autenticado con Google **Entonces** el rol de su sesión del BFF es `admin` (v1: rol único; no hay distinción de permisos). `[agente]`
  - AC1.5.7 **Dado** el cierre de sesión **Entonces** el front ejecuta el flujo de US1.4 y redirige a `/`. `[agente]`
  - AC1.5.8 **\[Debe NOT\]** El ID token no se guarda en `localStorage` ni en cookies, y la sola presencia de la cookie no autoriza por sí misma (la puerta real es el backend vía US1.3). `[agente]`

### US1.6 — BFF: GET /api/auth/me (Sincronización de Estado)

- **Responsable:** \[ Dev 1 \] · **Prioridad:** SHOULD · **Estado:** \[ \]
- **Descripción:** endpoint que confirma la sesión del BFF y devuelve la identidad, para resolver el caso de cookie viva con la sesión de Firebase perdida (IndexedDB borrado).
- **Criterios de aceptación:**
  - AC1.6.1 **Dado** `GET /api/auth/me` con cookie válida **Entonces** responde 200 con `{ uid, email, role }` (sin tokens). `[agente]`
  - AC1.6.2 **Dado** `GET /api/auth/me` sin cookie o con cookie inválida **Entonces** responde 401 `UNAUTHORIZED`. `[agente]`
  - AC1.6.3 **Dado** cookie válida pero sesión de Firebase perdida **Cuando** el front llama a `/api/auth/me` **Entonces** el front sincroniza su estado y decide si renovar o cerrar sesión. `[agente]`
  - AC1.6.4 **\[Debe NOT\]** `/api/auth/me` no devuelve el JWT, el idToken ni el refresh token. `[agente]`

### US1.7 — Ciclo de Vida del Inmueble y Código Secuencial

- **Responsable:** \[ Dev 1 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** casos de uso de dominio para crear, activar, ocultar y eliminar (soft delete). No existe `DRAFT`: un inmueble recién creado queda `HIDDEN` y solo pasa a `ACTIVE` si cumple los campos obligatorios.  
- **Criterios de aceptación:**  
  - AC1.7.1 **Dado** que un admin crea un inmueble **Cuando** pasa por `CreatePropertyUseCase` **Entonces** se asigna `codigo` `JF-XXXX` con un contador atómico en Firestore, el estado inicial es `HIDDEN` y se registra `createdAt`. `[agente]`  
  - AC1.7.2 **Dado** un inmueble **Entonces** `codigo`, `createdAt`, `fechaPublicacion` y `updatedAt` son de solo lectura en la API y en el editor. `[agente]`  
  - AC1.7.3 **Dado** un inmueble al que le falte alguno de estos datos: `operacion`, `tipo`, `titulo` (es), `departamento`, `municipio`, `precio` o al menos una foto **Cuando** se intenta pasar a `ACTIVE` **Entonces** responde 422 `VALIDATION_ERROR` con los campos faltantes. `[agente]`  
  - AC1.7.4 **Dado** un `precio` menor o igual a 0, o no entero **Entonces** se rechaza con 422\. `[agente]`  
  - AC1.7.5 **Dado** la primera activación de un inmueble **Entonces** se fija `fechaPublicacion`; ocultarlo y reactivarlo no la cambia. `[agente]`  
  - AC1.7.6 **Dado** un inmueble `HIDDEN` o `DELETED` **Cuando** se consulta el listado público **Entonces** se excluye de los resultados. `[agente]`  
  - AC1.7.7 **Dado** que se solicita por `:idOrSlug` un inmueble `HIDDEN` o `DELETED` desde la web pública **Entonces** responde 404 `PROPERTY_NOT_FOUND`. `[agente]`  
  - AC1.7.8 **Dado** que dos admins editan el mismo inmueble **Cuando** el segundo guarda con un `updatedAt` desactualizado **Entonces** responde 409 `CONFLICT`; la UI conserva lo que el usuario escribió y muestra un mensaje en español. `[agente]`  
  - AC1.7.9 **\[Debe NOT\]** No existe un estado vendido/alquilado ni `DRAFT`; «ocultar» o «eliminar» es la forma de retirar un inmueble. `[agente]`

### US1.8 — Firmado de URLs Presignadas para Cloudflare R2

- **Responsable:** \[ Dev 1 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Criterios de aceptación:**  
  - AC1.8.1 **Dado** un admin que va a subir un archivo **Cuando** envía `POST /api/v1/media/presigned-url` con nombre y tipo MIME **Entonces** se valida el rol (`X-User-Role: admin`) y responde una Presigned PUT URL que expira en 15 minutos. `[agente]`  
  - AC1.8.2 **Dado** la URL firmada **Entonces** la clave del objeto la genera el servidor bajo el prefijo `pending/` (`pending/<uuid>.<ext>`); el cliente no elige la ruta. `[agente]`  
  - AC1.8.3 **Dado** un tipo MIME fuera de `image/jpeg`, `image/png`, `image/webp` **Entonces** responde 422 `UNSUPPORTED_MEDIA` antes de firmar. `[agente]`  
  - AC1.8.4 **Dado** el bucket de R2 **Entonces** su CORS solo permite `PUT` desde los orígenes configurados (dominio de producción y localhost en desarrollo) y rechaza cualquier otro. `[agente]`  
  - AC1.8.5 **\[Debe NOT\]** El navegador no recibe las credenciales de R2, solo la URL firmada. `[agente]`

### US1.9 — Confirmación de Subida y Generación de Derivados

- **Responsable:** \[ Dev 1 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** una URL presignada no permite imponer tipo ni tamaño. Por eso, tras subir el archivo a `pending/`, el cliente lo confirma y el backend lo valida y genera sus versiones optimizadas (derivados WebP). El original se elimina al terminar.  
- **Reglas de procesamiento:**

| Concepto | Foto | Panorámica 360° |
| :---- | :---- | :---- |
| Formato (por contenido real) | JPEG, PNG o WebP | solo JPEG |
| Peso máximo | 10 MB | 25 MB |
| Lado mayor mínimo | 800 px | — |
| Proporción | libre | 2:1 (±1 %) |
| Píxeles totales máximos (ancho × alto) | 50 millones | 50 millones |
| Derivados (todos WebP) | lados mayores 320, 640, 1280 y 2048 px, **solo los menores que el lado mayor original**, más uno a tamaño completo con tope de 2048 px | uno solo, de hasta 4096 px de ancho |

- **Lado mayor:** dimensión más grande de la imagen en píxeles (el ancho en una foto horizontal, el alto en una vertical). Todos los tamaños se miden así, conservando la proporción. Nunca se amplía una imagen.  
- **Validación por cabecera:** el peso se obtiene de los metadatos del objeto; el tipo real, las dimensiones y la proporción se leen de los primeros 128 KB (se amplía hasta 1 MB si no alcanzan). El archivo completo solo se descarga cuando todas las validaciones pasaron.  
- **Orden de validación:** tipo → peso → dimensiones mínimas → tope de píxeles → proporción (solo panorámicas). Se responde el primer error encontrado.  
- **Códigos de error:** `UNSUPPORTED_MEDIA` (contenido no permitido o dimensiones ilegibles en 1 MB) · `IMAGE_TOO_LARGE` (peso o píxeles excedidos) · `IMAGE_TOO_SMALL` (lado mayor menor a 800 px) · `VALIDATION_ERROR` (clave inexistente o fuera de `pending/`, o panorámica que no es 2:1).  
- **Puerto de procesamiento:** la lectura de metadatos y la generación de derivados pasan por un puerto `ImageProcessor`, para que cambiar de librería solo implique cambiar su implementación.  
- **Criterios de aceptación:**  
  - AC1.9.1 **Dado** un archivo subido a `pending/` **Cuando** el cliente llama `POST /api/v1/media/confirm` con `{ key, recurso: 'foto' | 'panorama' }` **Entonces**, si es válido, responde 200 con las claves de sus derivados y elimina el original después de guardarlos todos. `[agente]`  
  - AC1.9.2 **Dado** una `key` inexistente o fuera de `pending/` **Entonces** responde 422 `VALIDATION_ERROR`. `[agente]`  
  - AC1.9.3 **Dado** una foto cuyo contenido real no es JPEG, PNG ni WebP (aunque su extensión o tipo declarado digan otra cosa) **Entonces** responde 422 `UNSUPPORTED_MEDIA`. `[agente]`  
  - AC1.9.4 **Dado** una foto de más de 10 MB **Entonces** responde 422 `IMAGE_TOO_LARGE`; **dado** una con lado mayor menor a 800 px **Entonces** responde 422 `IMAGE_TOO_SMALL`. `[agente]`  
  - AC1.9.5 **Dado** una imagen (foto o panorámica) con más de 50 millones de píxeles, aunque pese menos del máximo **Entonces** responde 422 `IMAGE_TOO_LARGE` sin decodificarla. `[agente]`  
  - AC1.9.6 **Dado** una imagen que incumple varias reglas **Entonces** el error devuelto sigue el orden de validación definido arriba. `[agente]`  
  - AC1.9.7 **Dado** un archivo que falla cualquier validación **Entonces** se elimina de R2 y no se genera ningún derivado. `[agente]`  
  - AC1.9.8 **Dado** una foto JPEG de 3000 px de lado mayor **Entonces** existen derivados WebP de 320, 640, 1280 y 2048 px, cada uno con `Content-Type: image/webp`. `[agente]`  
  - AC1.9.9 **Dado** una foto de 1000 px de lado mayor **Entonces** existen derivados de 320, 640 y 1000 px (este a tamaño completo) y **no** de 1280 ni 2048\. `[agente]`  
  - AC1.9.10 **Dado** una foto vertical de 3000 × 4000 px **Entonces** su derivado mayor mide 1536 × 2048 px. `[agente]`  
  - AC1.9.11 **Dado** una foto con EXIF, incluida la ubicación GPS **Entonces** ningún derivado conserva esos metadatos, y una foto tomada en vertical con celular (orientación guardada en el EXIF) se ve con la orientación correcta. `[agente]`  
  - AC1.9.12 **Dado** una panorámica **Entonces** se rechaza si no es JPEG (`UNSUPPORTED_MEDIA`), si pesa más de 25 MB (`IMAGE_TOO_LARGE`) o si su proporción no es 2:1 ±1 % (`VALIDATION_ERROR` con detalle en español). `[agente]`  
  - AC1.9.13 **Dado** una panorámica válida de 8192 × 4096 px **Entonces** se genera un derivado WebP de 4096 × 2048 px; **dado** una de 3000 × 1500 px **Entonces** su derivado conserva 3000 × 1500 px. `[agente]`  
  - AC1.9.14 **Dado** que falla la generación de cualquier derivado **Entonces** responde 500 `INTERNAL` con su `requestId`, elimina los derivados ya generados (no quedan parciales), no asocia la imagen al inmueble y deja el original en `pending/`. `[agente]`  
  - AC1.9.15 **Dado** esa falla **Entonces** el cliente puede repetir la confirmación con la misma clave hasta tres veces sin volver a subir el archivo. `[agente]`  
  - AC1.9.16 **Dado** el bucket de R2 **Entonces** tiene una regla de ciclo de vida que elimina los objetos de `pending/` con más de 1 día. `[agente]`  
  - AC1.9.17 **Dado** el código del backend **Entonces** la lectura de metadatos y la generación de derivados pasan solo por el puerto `ImageProcessor` (dominio o aplicación), con la implementación `SharpImageProcessor` en infraestructura. `[agente]`  
  - AC1.9.18 **Dado** el caso de uso de confirmación **Cuando** se prueba con una implementación falsa de `ImageProcessor` (sin `sharp`) **Entonces** sus pruebas unitarias pasan. `[agente]`  
  - AC1.9.19 **Dado** `SharpImageProcessor` **Entonces** fija el tope de píxeles de entrada de la librería en 50 millones como segunda barrera, y si se supera responde 422 `IMAGE_TOO_LARGE`. `[agente]`  
  - AC1.9.20 **\[Debe NOT\]** Ningún módulo fuera de infraestructura importa `sharp`. `[agente]`  
  - AC1.9.21 **\[Debe NOT\]** No se descarga completo un archivo que falle una validación por cabecera, y no se procesa ninguna imagen en Next.js (el optimizador `/_next/image` está prohibido, AC7.3.10) ni en el navegador para generar derivados; la pre-reducción obligatoria previa a la subida (AC4.2.9 / US7.5.1) es la única excepción permitida y no sustituye a los derivados, que siguen siendo responsabilidad exclusiva del backend. `[agente]`

### US1.10 — Consulta Pública del Catálogo (filtros, orden por fecha, cursor e índices)

- **Responsable:** \[ Dev 1 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** contrato del listado público y de la consulta de portada. Las igualdades (`operacion`, `status = ACTIVE`, `tipo`, ubicación `departamento` + `municipio` y `destacada`) y el rango de `precio` se resuelven en una sola consulta nativa de Firestore, ordenada por `createdAt` descendente con desempate por `id`. `destacada` se envía con un único valor (`true` o `false`, nunca ambos): la portada pide `true` y las pestañas hacen dos consultas, primero `true` y después `false`, para mostrar los destacados primero. La paginación es nativa por cursor y no hay filtrado posterior en Functions.  
- **Criterios de aceptación:**  
  - AC1.10.1 **Dado** `GET /api/v1/properties` con `operacion` (obligatorio), `destacada` (obligatorio: `true` o `false`, nunca ambos), `tipo`, `departamento` y `municipio` (juntos o ninguno), `precioMin`, `precioMax`, `cursor` y `limit` (12 por defecto, máx. 50\) **Entonces** responde `{ items, nextCursor }` solo con inmuebles `ACTIVE`, ordenados por `createdAt` descendente con desempate por `id`. `[agente]`  
  - AC1.10.2 **Dado** un rango de precio **Entonces** se resuelve en la propia consulta de Firestore (`>=` y `<=` sobre `precio`, con `orderBy createdAt desc`) y la paginación usa un cursor `{ createdAt, id }` (`startAfter`), sin duplicados ni huecos, incluso con `createdAt` iguales. `[agente]`
    - **PENDIENTE — validar en el emulador (US1.10):** Firestore exige que el **primer `orderBy`** sea sobre el **mismo campo** del filtro de rango (`>=`/`<=`); por eso esta consulta (`precio` + `orderBy(createdAt)`) puede rechazarse o exigir ordenar primero por `precio`, lo que chocaría con AC1.10.7. Los 8 presets de D28 y sus 8 índices se mantienen **tal como están**; el orden exacto de la consulta con rango se confirma en el emulador antes de cerrar US1.10. **No rediseñar presets.**  
  - AC1.10.3 **Dado** `precioMin` mayor que `precioMax` **Entonces** responde 422 `VALIDATION_ERROR`. `[agente]`  
  - AC1.10.4 **Dado** las combinaciones de filtros soportadas **Entonces** existe una única tabla en `./ARCHITECTURE.md`, un índice compuesto por combinación en `firestore.indexes.json` (igualdades, luego `precio` y por último `createdAt desc, id desc`) y la lista de los 8 presets en `shared-types` (el cliente la reexporta desde `src/lib/filters.ts`), las tres consistentes entre sí. `[agente]`  
  - AC1.10.5 **Dado** una combinación no soportada **Entonces** responde 422 `VALIDATION_ERROR`, nunca `FAILED_PRECONDITION` ni 500\. `[agente]`  
  - AC1.10.6 **Dado** `GET /api/v1/properties/featured` **Entonces** devuelve hasta 12 inmuebles `ACTIVE` con `destacada = true`, ordenados por `fechaPublicacion desc` (consulta propia, con su índice). `[agente]`  
  - AC1.10.7 **\[Debe NOT\]** Ninguna respuesta pública incluye inmuebles `HIDDEN`/`DELETED` ni campos internos, el listado se ordena por `createdAt` descendente (nunca por `precio`) y no se usa `AggregationQuery`. `[agente]`

### US1.11 — Insignia «Nuevo» Derivada en el Frontend

- **Responsable:** \[ Dev 2 \] · **Prioridad:** SHOULD · **Estado:** \[ \]  
- **Descripción:** la insignia «Nuevo» se calcula en el frontend a partir de `createdAt`; no se persiste ninguna bandera en Firestore ni se devuelve en la API.  
- **Criterios de aceptación:**  
  - AC1.11.1 **Dado** un inmueble cuyo `createdAt` tiene menos de 30 días **Cuando** el frontend renderiza su tarjeta **Entonces** muestra la insignia «Nuevo» calculada desde `createdAt`. `[agente]`  
  - AC1.11.2 **Dado** un inmueble cuyo `createdAt` tiene 30 días o más **Entonces** el frontend no muestra la insignia «Nuevo». `[agente]`  
  - AC1.11.3 **Dado** el modelo de datos **Entonces** `nuevo` no existe en Firestore ni en las respuestas de la API; el umbral de 30 días vive en el frontend. `[agente]`  
  - AC1.11.4 **\[Debe NOT\]** No hay tarea programada, variable `NEW_FLAG_DAYS` ni revalidación asociada al paso de los 30 días. `[agente]`

### US1.12 — Autorización por Roles (COULD)

- **Responsable:** \[ Dev 1 \] · **Prioridad:** COULD · **Estado:** \[ \]
- **Descripción:** en la v1 hay un único rol (`admin`); esta historia introduce roles distintos (p. ej. editor), el enforcement en el backend y la UX de denegación.
- **Criterios de aceptación:**
  - AC1.12.1 **Dado** un usuario cuyo rol no permite una operación **Entonces** el backend responde 403 `PERMISSION_DENIED` (el rol viaja en `X-User-Role`). `[agente]`
  - AC1.12.2 **Dado** un 403 del backend **Entonces** la UI muestra un estado «no autorizado» en español, sin reintentar y sin redirigir al login. `[agente]`
  - AC1.12.3 **Dado** el modelo ampliado **Entonces** el backend resuelve el rol real y el BFF lo emite en la cookie (deja de ser fijo `admin`). `[agente]`
  - AC1.12.4 **\[Debe NOT\]** El cliente nunca decide permisos por sí mismo: la autorización es siempre del backend. `[agente]`

---

## ÉPICA 2: Catálogo Público y Buscador (`packages/client`)

### US2.1 — Navegación por Pestañas Independientes

- **Responsable:** \[ Dev 2 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** `/venta`, `/alquiler` y `/proyectos` son listados separados; cada uno muestra los inmuebles de su `operacion` (`VENTA`, `ALQUILER`, `PROYECTO_SOBRE_PLANOS`).  
- **Criterios de aceptación:**  
  - AC2.1.1 **Dado** el menú principal **Entonces** hay accesos a Venta, Alquiler, Proyectos y Servicios, y un selector de idioma. `[agente]`  
  - AC2.1.2 **Dado** que navego en *Venta* con filtros y cambio a *Alquiler* **Entonces** los filtros y parámetros se resetean por completo. `[agente]`  
  - AC2.1.3 **Dado** un inmueble **Entonces** aparece solo en la pestaña de su `operacion`. `[agente]`  
  - AC2.1.4 **Dado** un ancho menor a 768 px (375 px de referencia) **Entonces** los accesos no se muestran en línea sino detrás de un botón de menú con nombre accesible «Abrir menú» (en inglés, «Open menu»), y el logo permanece visible. `[agente]`  
  - AC2.1.5 **Dado** el botón de menú **Cuando** lo toco **Entonces** se despliega un panel con los mismos accesos que en escritorio, cada uno con un área táctil de al menos 44 × 44 px. `[agente]`  
  - AC2.1.6 **Dado** el panel abierto **Entonces** se cierra al navegar a un acceso, con su botón de cerrar, con la tecla Escape y al tocar fuera. `[agente]`  
  - AC2.1.7 **Dado** el panel abierto **Entonces** el botón indica `aria-expanded="true"`, el foco queda dentro del panel, la página de fondo no se desplaza y, al cerrar, el foco vuelve al botón. `[agente]`  
  - AC2.1.8 **Dado** cualquier página pública (portada, listados, ficha, servicios, nosotros, contacto y consigne) con anchos de 320, 375 y 414 px **Entonces** no hay desplazamiento horizontal y el header no se desborda. `[agente]`  
  - AC2.1.9 **Dado** un ancho de 768 px o más **Entonces** los accesos se muestran en línea y no aparece el botón de menú. `[agente]`

### US2.2 — Buscador con Filtros, Skeletons y Estados de Carga

- **Responsable:** \[ Dev 2 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** hay dos clases de filtros (D9). La ubicación llega hasta municipio; no hay filtro de sector (D24).

| Clase | Filtros | Comportamiento |
| :---- | :---- | :---- |
| Fija por pestaña | operación | cambiar de pestaña inicia una búsqueda nueva |
| Fija del listado público | `status = ACTIVE` y `destacada` (un solo valor `true`/`false`) | nunca se mezclan `HIDDEN`/`DELETED`; la portada pide `destacada=true` y las pestañas piden `true` y después `false` |
| Base de datos | tipo de inmueble, ubicación (`departamento` + `municipio` juntos), rango de precio | al cambiar, TanStack Query pide de nuevo al backend (US1.10) |
| Frontend | dormitorios, baños, área construida, área de lote, estrato, parqueaderos, amenidades | filtran en caliente el arreglo ya cargado, sin petición |

- **Criterios de aceptación:**  
  - AC2.2.1 **Dado** un listado **Entonces** ofrece los filtros de la tabla anterior. `[agente]`  
  - AC2.2.2 **Dado** cualquier filtro (de base de datos o de frontend) **Cuando** cambia **Entonces** la URL lo refleja y es la única fuente de verdad (recargar reproduce el resultado). `[agente]`  
  - AC2.2.3 **Dado** una combinación de filtros de base de datos no documentada (US1.10) **Entonces** el cliente la impide antes de llegar al backend, con un mensaje claro. `[agente]`  
  - AC2.2.4 **Dado** un cambio en un filtro de base de datos **Cuando** TanStack Query hace el fetching **Entonces** las tarjetas anteriores se mantienen con opacidad reducida (`keepPreviousData`), la barra `@mantine/nprogress` color `#f9ea1b` se activa arriba y no se muestran spinners. `[agente]`  
  - AC2.2.5 **Dado** un cambio en un filtro de frontend **Entonces** el resultado se actualiza al instante sin ninguna petición de red y sin barra de progreso. `[agente]`  
  - AC2.2.6 **Dado** un filtro de frontend activo y páginas aún sin cargar (US2.3) **Entonces** el cliente carga automáticamente las páginas restantes (el catálogo es pequeño) para filtrar sobre el total, y el contador refleja el total filtrado. `[agente]`  
  - AC2.2.7 **Dado** que hay resultados **Entonces** el orden es siempre `createdAt` descendente (más recientes primero), con los destacados primero en las pestañas, sin control de ordenación, y una etiqueta discreta lo indica («Destacados primero · Más recientes»). `[agente]`  
  - AC2.2.8 **Dado** la carga inicial **Entonces** se renderiza una grilla de `Skeleton` de Mantine con las proporciones reales (4:3 en la imagen, líneas para el texto) y sin saltos de layout. `[agente]`  
  - AC2.2.9 **Dado** que la respuesta llega en menos de \~200 ms **Entonces** no se muestra el skeleton. `[agente]`  
  - AC2.2.10 **Dado** cero resultados **Entonces** se muestra un estado vacío en el idioma de la página que invita a dar más información sobre lo que busca y ofrece un botón de WhatsApp con un mensaje prediseñado que resume los filtros activos; los filtros se conservan y no hay error 500\. `[agente]`  
  - AC2.2.11 **Dado** una tarjeta **Entonces** muestra imagen (derivado 640), código, título, precio, municipio, íconos de dormitorios/baños/área/estrato y una insignia «Nuevo» calculada en el frontend cuando `createdAt` tiene menos de 30 días. `[agente]`  
  - AC2.2.12 **Dado** la primera carga de un listado **Entonces** los datos se hidratan desde el servidor (prefetch \+ `HydrationBoundary`) y el contenido inicial llega en el HTML. `[agente]`  
  - AC2.2.13 **\[Debe NOT\]** No hay `?page=` ni `?cursor=` en la URL, ni control de orden, ni filtro de sector, ni spinners. `[agente]`

### US2.3 — Scroll Infinito del Listado

- **Responsable:** \[ Dev 2 \] · **Prioridad:** SHOULD · **Estado:** \[ \]  
- **Descripción:** carga progresiva por cursor, de 12 en 12 (`useInfiniteQuery`), en cada pestaña. Primero se agota la serie `destacada = true` (destacados) y después se continúa con `destacada = false` (resto), sin mezclar ambos valores en una misma consulta; al cambiar de serie, la nueva consulta arranca sin cursor (`startAfter` solo es válido dentro de su propia serie).  
- **Criterios de aceptación:**  
  - AC2.3.1 **Dado** más de 12 inmuebles **Entonces** se muestran 12 y, al acercarme al final de la lista, se cargan los 12 siguientes, sin duplicados ni huecos (incluso con `createdAt` iguales); al agotarse los destacados, la siguiente página continúa con los no destacados **en una consulta nueva (`destacada = false`) que no arrastra el cursor de la serie anterior: `startAfter` solo aplica dentro de su propia serie y cada serie empieza sin cursor**. `[agente]`  
  - AC2.3.2 **Dado** 12 o menos **Entonces** no hay petición adicional ni control de carga. `[agente]`  
  - AC2.3.3 **Dado** que se carga la página siguiente **Entonces** se muestran tarjetas `Skeleton` al final de la lista, sin spinner. `[agente]`  
  - AC2.3.4 **Dado** el disparador de carga **Entonces** es un botón «Cargar más», accesible por teclado, que también se activa solo al entrar al viewport. `[agente]`  
  - AC2.3.5 **Dado** que no quedan más resultados **Entonces** se muestra un mensaje de fin de lista y el footer es alcanzable. `[agente]`  
  - AC2.3.6 **Dado** que abro una ficha y vuelvo atrás **Entonces** se restauran las páginas ya cargadas y la posición de scroll (caché de TanStack Query). `[agente]`  
  - AC2.3.7 **Dado** un error al cargar la página siguiente **Entonces** un bloque dentro de la lista ofrece «Reintentar» y conserva lo ya cargado (US5.4). `[agente]`  
  - AC2.3.8 **\[Debe NOT\]** No hay paginación numerada ni por offset. `[agente]`

### US2.4 — Ficha Técnica de Inmueble con SEO y Puntos de Interés

- **Responsable:** \[ Dev 2 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** renderizado SSR/ISR de la ficha en `/propiedad/[slug]` con todos los datos, la galería y los recursos multimedia opcionales.  
- **Criterios de aceptación:**  
  - AC2.4.1 **Dado** un inmueble `ACTIVE` **Cuando** entro a su ficha **Entonces** veo galería, código, precio y todas las características. `[agente]`  
  - AC2.4.2 **Dado** estrato, predial, administración, acabados, antigüedad, áreas, parqueaderos, depósito (cuarto útil) o amenidades (piscina, cancha, gimnasio, etc.) **Cuando** existen **Entonces** se muestran; **cuando** no, la fila no aparece. `[agente]`  
  - AC2.4.3 **Dado** `operacion = PROYECTO_SOBRE_PLANOS` **Entonces** la ficha muestra además etapa, mes y año de entrega estimada y unidades disponibles cuando existen; si no existen, la fila no aparece. `[agente]`  
  - AC2.4.4 **Dado** los puntos de interés **Entonces** hay categorías predefinidas con iconos vectoriales de Mantine (educación, gimnasio, zona comercial, avenida principal, transporte público, salud) y se permiten ítems personalizados. `[agente]`  
  - AC2.4.5 **Dado** que pulso una foto **Entonces** se abre un visor modal con el derivado de 2048 px, navegable con el teclado y sin librería externa de lightbox. `[agente]`  
  - AC2.4.6 **Dado** un inmueble con videos **Entonces** se muestra una miniatura con botón de reproducción; el iframe de YouTube (`youtube-nocookie`) solo se carga al pulsarla, dentro de un modal. `[agente]`  
  - AC2.4.7 **Dado** un inmueble con panorámicas **Entonces** se muestra un botón «Ver en 360°» y Pannellum se carga con importación dinámica solo al abrirlo. `[agente]`  
  - AC2.4.8 **Dado** un inmueble sin videos o sin panorámicas **Entonces** se ocultan por completo sus botones, sin placeholders vacíos. `[agente]`  
  - AC2.4.9 **Dado** un slug desconocido, `HIDDEN` o `DELETED` **Entonces** responde el 404 de Next.js. `[agente]`  
  - AC2.4.10 **Dado** un detalle con 8 imágenes **Cuando** mido rendimiento **Entonces** Lighthouse performance es ≥ 85 en móvil. `[agente]`  
  - AC2.4.11 **\[Debe NOT\]** No hay mapa, `descripcion` no se renderiza con `dangerouslySetInnerHTML` y Pannellum no entra al bundle inicial. `[agente]`

### US2.5 — Botón de WhatsApp en la Ficha y Helper de Enlaces

- **Responsable:** \[ Dev 2 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** la ficha tiene un único botón de WhatsApp. Todo el sitio construye sus enlaces de WhatsApp con un solo helper (regla T3).  
- **Criterios de aceptación:**  
  - AC2.5.1 **Dado** un usuario en la ficha **Cuando** presiona *«Preguntar por este inmueble»* **Entonces** se abre `https://web.whatsapp.com/send?phone=<número>&text=...` en escritorio o `https://api.whatsapp.com/send?phone=<número>&text=...` en móvil. `[agente]`  
  - AC2.5.2 **Dado** el mensaje **Entonces** va codificado, en el idioma de la página, y contiene una solicitud corta de información más el `codigo` y el `titulo` del inmueble. `[agente]`  
  - AC2.5.3 **Dado** el número **Entonces** proviene de `NEXT_PUBLIC_WHATSAPP_NUMBER`. `[agente]`  
  - AC2.5.4 **Dado** el helper `buildWhatsAppUrl` **Entonces** es una función pura `({ number, message, isMobile }) => string` en `packages/client/src/lib/whatsapp.ts` (D35); la detección de escritorio o móvil ocurre en el manejador del clic, en el cliente (nunca en el render del servidor), y lo usan todos los enlaces de WhatsApp del sitio. `[agente]`  
  - AC2.5.5 **\[Debe NOT\]** El número no aparece literal en ningún `.ts`/`.tsx` y la ficha tiene un solo botón de WhatsApp. `[agente]`

### US2.6 — Portada (Home)

- **Responsable:** \[ Dev 2 \] · **Prioridad:** SHOULD · **Estado:** \[ \]  
- **Criterios de aceptación:**  
  - AC2.6.1 **Dado** `/es` o `/en` **Entonces** hay un hero con accesos directos a Venta, Alquiler y Proyectos. `[agente]`  
  - AC2.6.2 **Dado** la portada **Entonces** hay una franja «Destacadas», una vista previa de servicios con un CTA hacia `/contacto` y un bloque «Nosotros», en ese orden. `[agente]`  
  - AC2.6.3 **Dado** un inmueble con `destacada = true` y `status = ACTIVE` **Entonces** aparece en «Destacadas»; **dado** uno `HIDDEN` o `DELETED` **Entonces** no aparece aunque tenga `destacada = true`. `[agente]`  
  - AC2.6.4 **Dado** el bloque «Nosotros» **Entonces** muestra el `extracto` de la página Nosotros (no su contenido completo) y un enlace «Conocer más» hacia `/nosotros`. `[agente]`  
  - AC2.6.5 **Dado** que no hay inmuebles destacados, servicios activos o `extracto` **Entonces** la franja o el bloque correspondiente no se renderiza, sin placeholders vacíos. `[agente]`  
  - AC2.6.6 **Dado** la portada **Entonces** su última sección muestra los logos de empresas aliadas, definidos en un componente del código (no en base de datos), con tamaño y orden que responden al viewport. `[agente]`  
  - AC2.6.7 **\[Debe NOT\]** No hay mapa, estadísticas inventadas, testimonios ni carrusel con librería externa. `[agente]`

### US2.7 — SEO Técnico (ambos idiomas)

- **Responsable:** \[ Dev 2 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Criterios de aceptación:**  
  - AC2.7.1 **Dado** cualquier ruta pública, en `es` y en `en` **Entonces** tiene `title` y `description` en su idioma, URL canónica derivada de `NEXT_PUBLIC_SITE_URL` con la ruta de ese idioma, y `<html lang>` en `es-CO` o `en`. `[agente]`  
  - AC2.7.2 **Dado** cada página **Entonces** declara `hreflang` hacia su equivalente (`es-CO`, `en`) y `x-default` hacia español. `[agente]`  
  - AC2.7.3 **Dado** `/sitemap.xml` **Entonces** lista las rutas públicas (incluida Nosotros) en ambos idiomas con sus alternativas, los servicios activos y solo los inmuebles `ACTIVE`, y omite las páginas en inglés sin traducción completa (AC0.4.5). `[agente]`  
  - AC2.7.4 **Dado** `/robots.txt` **Entonces** contiene `Disallow: /admin` y `Disallow: /api` y la línea `Sitemap:`. `[agente]`  
  - AC2.7.5 **Dado** `/robots.txt` **Entonces** permite explícitamente el acceso a todos los agentes y scrapers conocidos (p. ej. ClaudeBot, GPTBot, PerplexityBot, Google-Extended, CCBot; lista mantenida en código) y cada grupo repite los `Disallow` de `/admin` y `/api` (un grupo específico no hereda los del grupo `*`). `[agente]`  
  - AC2.7.6 **Dado** una ficha **Entonces** su `application/ld+json` parsea, no contiene `undefined`, incluye `inLanguage` y `addressCountry` es `"CO"`. `[agente]`  
  - AC2.7.7 **\[Debe NOT\]** No se indexan inmuebles `HIDDEN`, `DELETED` ni `/admin`. `[agente]`

---

## ÉPICA 3: Consignación y Notificaciones por Correo (`packages/functions` \+ `packages/client`)

### US3.1 — Formulario «Consigne su Propiedad»

- **Responsable:** \[ Fullstack \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** único formulario del sitio. Permite que el dueño de un inmueble solicite publicarlo; **no** sirve para preguntar por un inmueble ya publicado (eso es el botón de WhatsApp, US2.5). No se guarda nada (D11).  
- **Criterios de aceptación:**  
  - AC3.1.1 **Dado** `/consigne-su-propiedad` (y su equivalente en inglés) **Entonces** el formulario tiene *Sus datos personales* (nombre, teléfono, email) y *Datos de su inmueble* (tipo de inmueble, ubicación, valor, área construida, área de lote, mensaje) más el consentimiento (US3.3). Son obligatorios nombre, teléfono, email, tipo de inmueble, ubicación y consentimiento; el resto es opcional. `[agente]`  
  - AC3.1.2 **Dado** una validación fallida (p. ej. tipo de inmueble vacío) **Entonces** el envío se impide, los errores aparecen junto a cada campo con `form.setErrors()`, sin notificación flotante, y se conserva lo escrito. `[agente]`  
  - AC3.1.3 **Dado** el teléfono **Entonces** se normaliza a formato internacional; si tiene 10 dígitos y empieza por 3 se asume `+57`, y uno inválido muestra un error en el campo. `[agente]`  
  - AC3.1.4 **Dado** un envío válido **Cuando** el backend responde éxito **Entonces** el cliente muestra una confirmación en el idioma de la página. No se ofrece botón de WhatsApp en este caso. `[agente]`  
  - AC3.1.5 **Dado** que el backend responde `EMAIL_DELIVERY_FAILED` **Entonces** el formulario conserva los datos, se muestra un aviso en el idioma de la página y un botón «Enviar por WhatsApp» que abre WhatsApp (helper T3) al número `NEXT_PUBLIC_WHATSAPP_NUMBER` con un mensaje en español que resume los datos del formulario (truncado si el enlace supera \~1.500 caracteres). Es una acción del usuario. `[agente]`  
  - AC3.1.6 **Dado** una solicitud en curso **Entonces** el botón de envío queda deshabilitado hasta que el backend responda. `[agente]`  
  - AC3.1.7 **\[Debe NOT\]** No se persiste ningún dato del formulario, no se promete ni se implementa una notificación automática a WhatsApp y no se usa CAPTCHA. `[agente]`

### US3.2 — Notificación por Correo con Resend

- **Responsable:** \[ Dev 1 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** `POST /api/v1/consignments` valida la solicitud y envía dos correos: uno a Juan Fernando y un «Recibo» al solicitante. El contenido de la solicitud no se traduce (US0.5 aplica solo al contenido que publican los admins).  
- **Criterios de aceptación:**  
  - AC3.2.1 **Dado** una solicitud válida **Entonces** se envía vía Resend un correo HTML al email corporativo de Juan Fernando (variable `CONSIGNMENT_TO_EMAIL`), con asunto y cuerpo en español, que incluye nombre, teléfono, email, datos del inmueble, mensaje, idioma del solicitante y fecha en `America/Bogota`. `[agente]`  
  - AC3.2.2 **Dado** ese correo **Entonces** incluye un enlace `https://wa.me/<teléfono normalizado>?text=...` con una respuesta preformateada en el idioma del solicitante, para que Juan conteste por WhatsApp desde el correo, y tiene `Reply-To` con el email del solicitante. `[agente]`  
  - AC3.2.3 **Dado** que el correo a Juan se envió **Entonces** se envía al solicitante un correo de recibo («Recibo»), en su idioma, que confirma la recepción y resume lo enviado. Si este segundo envío falla, la solicitud se considera exitosa y se registra un log de advertencia. `[agente]`  
  - AC3.2.4 **Dado** que falla el correo a Juan **Entonces** responde 502 `EMAIL_DELIVERY_FAILED`, no se envía el recibo y se activa el respaldo de US3.1 (AC3.1.5). `[agente]`  
  - AC3.2.5 **Dado** los datos del usuario **Entonces** se escapan antes de entrar al HTML o a una cabecera del correo (sin inyección de HTML ni saltos de línea en el asunto). `[agente]`  
  - AC3.2.6 **Dado** el remitente **Entonces** pertenece a un dominio verificado en Resend (SPF y DKIM). `[manual]`  
  - AC3.2.7 **\[Debe NOT\]** No se guarda ningún dato de la solicitud, no se registra PII completa a nivel `info` (solo `requestId` y resultado) y `EMAIL_DELIVERY_FAILED` no expone datos personales. `[agente]`

### US3.3 — Consentimiento de Tratamiento de Datos

- **Responsable:** \[ Fullstack \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Criterios de aceptación:**  
  - AC3.3.1 **Dado** el formulario **Entonces** hay un checkbox obligatorio y sin premarcar «Autorizo el Tratamiento de Datos Personales», con enlace a la Política de Tratamiento de Datos de su idioma. `[agente]`  
  - AC3.3.2 **Dado** `consent` falso o ausente **Entonces** el frontend impide el envío y, si esa capa se omite, el backend responde 422 `CONSENT_REQUIRED` y no envía ningún correo (defensa en profundidad). `[agente]`  
  - AC3.3.3 **\[Debe NOT\]** El checkbox nunca es opcional ni viene premarcado, y los datos no se envían a servicios de formularios de terceros. `[agente]`

### US3.4 — Protección Contra Bots y Límite de Envíos

- **Responsable:** \[ Dev 1 \] · **Prioridad:** SHOULD · **Estado:** \[ \]  
- **Criterios de aceptación:**  
  - AC3.4.1 **Dado** un campo oculto `sitio` con valor **Entonces** la respuesta es de éxito pero no se envía ningún correo. `[agente]`  
  - AC3.4.2 **Dado** el 6.º envío en un minuto desde la misma IP (la de `X-Client-IP`, AC0.2.5) **Entonces** responde 429 `RATE_LIMITED`; los contadores viven en Firestore con política TTL. `[agente]`  
  - AC3.4.3 **Dado** de 1 a 5 envíos normales en un minuto **Entonces** nunca se responde 429\. `[agente]`  
  - AC3.4.4 **\[Debe NOT\]** No se usa CAPTCHA ni vendor de verificación. `[agente]`

---

## ÉPICA 4: CMS y Gestión (`packages/client` \+ `packages/functions`)

### US4.1 — CRUD de Inmuebles en el Panel

- **Responsable:** \[ Fullstack \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** panel privado para hasta 5 administradores, usable desde celular y computadora, solo en español (interfaz; los campos en inglés de los inmuebles son editables, AC4.1.4).  
- **Criterios de aceptación:**  
  - AC4.1.1 **Dado** `/admin/propiedades` **Entonces** lista los inmuebles no eliminados, con código, título, operación y estado, y permite abrir el editor, activar y ocultar. `[agente]`  
  - AC4.1.2 **Dado** `/admin/propiedades/nueva` **Cuando** guardo **Entonces** el inmueble queda `HIDDEN` con código asignado y no aparece en ninguna ruta pública. `[agente]`  
  - AC4.1.3 **Dado** el editor **Entonces** cubre los campos editables de Property: `operacion`, `tipo`, `titulo`, `descripcion`, `precio`, `departamento`, `municipio`, `estrato`, `predial`, `administracion`, `acabados`, `antiguedad`, `areaConstruida`, `areaLote`, `dormitorios`, `banos`, `parqueaderos`, `deposito`, `amenidades`, `puntosInteres`, `fotos`, `videos`, `panoramas`, `destacada` y `status`; y muestra de solo lectura `codigo`, `fechaPublicacion`, `createdAt` y `updatedAt`. `[agente]`  
  - AC4.1.4: **Dado** un Administrador creando o editando los campos traducibles del inmueble **Cuando** observa la interfaz del editor **Entonces** cada campo traducible se muestra con su par de entradas editables en español (`es`) e inglés (`en`), con un indicador de estado de traducción para cada campo («Actualizada» o «Pendiente», regla de AC0.5.11) y un interruptor individual que activa o desactiva la traducción automática de ese campo (activada por defecto) **Y además** hay un interruptor global que aplica el mismo valor a la traducción automática de todos los campos traducibles **Y cuando** presiona **«Guardar»** **Entonces** el backend traduce únicamente los campos con traducción automática activa que estén «Pendiente», persiste los valores de `en` escritos a mano y refleja el estado resultante en cada indicador. `[agente]`  
  - AC4.1.5 **Dado** `operacion = PROYECTO_SOBRE_PLANOS` **Entonces** el editor muestra un bloque adicional con etapa, mes y año de entrega estimada y unidades disponibles; **dado** otra operación **Entonces** el bloque no se muestra y no se guarda. `[agente]`  
  - AC4.1.6 **Dado** un inmueble completo **Cuando** lo guardo **Entonces** pasa automáticamente a `ACTIVE` y aparece público (US0.3); **dado** uno incompleto **Entonces** se muestra qué falta, en español. `[agente]`  
  - AC4.1.7 **Dado** un inmueble **Cuando** lo oculto o lo elimino **Entonces** deja de ser público; «eliminar» es un soft delete que pide confirmación. `[agente]`  
  - AC4.1.8 **Dado** un conflicto de edición **Entonces** se muestra el mensaje de AC1.7.8 y no se descarta lo escrito. `[agente]`  
  - AC4.1.9 **Dado** el editor **Entonces** tiene tres pestañas: «Editar», «Vista previa de tarjeta» y «Vista previa de ficha». Las vistas previas usan los mismos componentes del sitio público con el estado actual del formulario (aunque no esté guardado), solo muestran lo que esté completo y permiten alternar entre ES y EN; en EN muestran el contenido en inglés (la última traducción guardada o la editada manualmente), con un aviso de que se actualizará al guardar solo si ese campo tiene la traducción automática activa. `[agente]`  
  - AC4.1.10 **Dado** un viewport de 375 px **Entonces** todas las pantallas del panel son operables sin desbordamiento horizontal. `[agente]`  
  - AC4.1.11 **\[Debe NOT\]** No hay roles adicionales ni más de lo que requieren los administradores (≤ 5), ni editor WYSIWYG. `[agente]`  

### US4.2 — Uploader de Fotos con Reordenamiento y Portada

- **Responsable:** \[ Fullstack \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Criterios de aceptación:**  
  - AC4.2.1 **Dado** un admin editando un inmueble **Cuando** arrastra varios archivos **Entonces** se suben directo a R2 por URL presignada (US1.8), se confirman (US1.9) y aparecen en una grilla de miniaturas reordenable, cada una con barra de progreso. `[agente]`  
  - AC4.2.2 **Dado** la grilla **Entonces** la primera posición muestra la insignia **«Portada»** y un tamaño mayor. `[agente]`  
  - AC4.2.3 **Dado** que arrastro otra imagen a la primera posición o presiono «Establecer como portada» (visible al pasar el cursor; siempre visible en pantallas táctiles) **Entonces** el orden del arreglo se actualiza y persiste al recargar. `[agente]`  
  - AC4.2.4 **Dado** que subo la primera foto a un inmueble sin fotos **Entonces** queda como portada; las que se carguen después no la reemplazan y se añaden al final. `[agente]`  
  - AC4.2.5 **Dado** una pantalla táctil (donde el arrastre no funciona) **Entonces** hay botones «mover antes» / «mover después» sobre la foto en sus extremos laterales respectivos. `[agente]`  
  - AC4.2.6 **Dado** que falla la subida o la confirmación de un archivo **Entonces** se muestra el error de ese archivo con un botón de reintento (la confirmación reutiliza la misma clave hasta tres veces, AC1.9.15), sin afectar a los demás. `[agente]`  
  - AC4.2.7 **Dado** que elimino una foto **Entonces** se pide confirmación; si era la portada, la siguiente pasa a serlo; y al guardar se eliminan sus derivados de R2. `[agente]`  
  - AC4.2.8 **Dado** un inmueble sin fotos **Cuando** intento activarlo **Entonces** se rechaza (AC1.7.3). `[agente]`  
  - AC4.2.9 **Dado** una foto seleccionada en el editor **Cuando** se prepara la subida **Entonces** el navegador reduce su lado mayor a como máximo 2048 px (sin ampliarla nunca) y la recomprime, aplicando la orientación visual EXIF y descartando sus metadatos (AC1.9.11), antes de enviarla a la URL presignada; es el comportamiento por defecto y no opcional (US7.5.1, US7.5.2). `[agente]`  
  - AC4.2.10 **\[Debe NOT\]** Los errores de archivo (`UNSUPPORTED_MEDIA`, `IMAGE_TOO_LARGE`, `IMAGE_TOO_SMALL`) no se muestran como códigos crudos sino con mensajes en español que indican los límites (10 MB, 800 px). `[agente]`

### US4.3 — Videos y Panorámicas 360°

- **Responsable:** \[ Fullstack \] · **Prioridad:** SHOULD · **Estado:** \[ \]  
- **Criterios de aceptación:**  
  - AC4.3.1 **Dado** el editor **Entonces** hay un bloque independiente de hasta 2 enlaces de YouTube, validados por formato (`youtube.com/watch`, `youtu.be`, `youtube.com/embed`). `[agente]`  
  - AC4.3.2 **Dado** un enlace que no es de YouTube **Entonces** responde 422 `VALIDATION_ERROR` con mensaje en español. `[agente]`  
  - AC4.3.3 **Dado** el editor **Entonces** hay un bloque independiente para subir hasta 3 panorámicas `.jpg` a R2 con el mismo flujo de URL presignada \+ confirmación (`recurso: 'panorama'`). `[agente]`  
  - AC4.3.4 **Dado** un inmueble con 3 panorámicas **Entonces** el botón de subir una cuarta está deshabilitado; si aun así se envía, responde 422 `VALIDATION_ERROR` con mensaje en español y la zona de carga queda deshabilitada. `[agente]`  
  - AC4.3.5 **Dado** una imagen que no cumple 2:1 **Entonces** se rechaza con `VALIDATION_ERROR` y detalle en español. `[agente]`  
  - AC4.3.6 **\[Debe NOT\]** Los videos no se suben como archivo y los bloques de video y 360° no se mezclan con la grilla de fotos. `[agente]`

### US4.4 — Gestión de Servicios (CRUD Editable)

- **Responsable:** \[ Fullstack \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** no hay una cantidad fija de servicios. El admin puede crear, editar, ocultar, reordenar y eliminar servicios, incluida su galería de obras. Usan los mismos estados que los inmuebles (`ACTIVE`, `HIDDEN`, `DELETED`). `cuerpo` es texto plano con párrafos (sin HTML).  
- **Criterios de aceptación:**  
  - AC4.4.1 **Dado** `/admin/servicios` **Cuando** creo un servicio con título, resumen, cuerpo y fotos **Entonces** se genera su `slug` único, queda `HIDDEN` y solo aparece en el sitio público cuando lo activo. `[agente]`  
  - AC4.4.2 **Dado** un servicio existente **Cuando** edito título, resumen, cuerpo, fotos o estado **Entonces** la página pública refleja el cambio tras la revalidación (US0.3). `[agente]`  
  - AC4.4.3 **Dado** la lista de servicios **Cuando** reordeno **Entonces** el campo `orden` persiste y define el orden público. `[agente]`  
  - AC4.4.4 **Dado** un servicio **Cuando** lo oculto o lo elimino **Entonces** se pide confirmación antes de cambiar su estado y deja de existir en el sitio público (404 `SERVICE_NOT_FOUND`). `[agente]`  
  - AC4.4.5 **Dado** que existen entre 0 y N servicios **Entonces** el listado público se adapta sin cambios de código. `[agente]`  
  - AC4.4.6 **Dado** una galería de obras **Entonces** reutiliza el flujo de fotos de US4.2 (portada, orden, derivados). `[agente]`  
  - AC4.4.7 **Dado** el editor **Entonces** título, resumen y cuerpo se escriben solo en español (en la v1 el editor de servicios no expone campos en inglés ni interruptores de traducción), con el mismo indicador de estado de traducción de AC4.1.4 (regla de AC0.5.11). `[agente]`  
  - AC4.4.8 **\[Debe NOT\]** El copy de los servicios no está escrito en JSX y no hay precios inventados. `[agente]`

### US4.5 — Gestión de la Página «Nosotros» 

- **Responsable:** \[ Fullstack \] · **Prioridad:** SHOULD · **Estado:** \[ \]  
- **Descripción:** el documento único de ‘Nosotros’ (D25) se carga con un seed a espera de que el admin lo edite Las secciones son libres: el cliente decide cuáles incluir (visión, misión, descripción, objetivos, propósito, historia, etc.). Todo se escribe en español; la traducción automática (activa por defecto) genera el inglés al guardar (US0.5), y el editor muestra el indicador de estado (en la v1 no expone campos en inglés ni interruptores de traducción).   
- **Criterios de aceptación:**  
  - AC4.5.1 **Dado** `/admin/nosotros` **Entonces** el admin edita `titulo`, `extracto` (con contador de caracteres), una lista de secciones (agregar, editar, eliminar y reordenar; cada una con título y cuerpo) y una lista de integrantes del equipo (agregar, editar, eliminar y reordenar; nombre, cargo, descripción opcional y foto opcional). `[agente]`  
  - AC4.5.2 **Dado** la foto de un integrante **Entonces** reutiliza el flujo de US1.8/US1.9 (URL presignada \+ confirmación \+ derivados), con una sola foto por integrante; reemplazarla o eliminarla borra sus derivados al guardar. `[agente]`  
  - AC4.5.3 **Dado** un `extracto` de más de 500 caracteres **Entonces** responde 422 `VALIDATION_ERROR` con mensaje en español. `[agente]`  
  - AC4.5.4 **Dado** que guardo **Entonces** se traduce (US0.5, solo campos con traducción automática activa), se escribe y se revalida (US0.3), y el editor muestra el indicador de traducción de AC4.1.4. `[agente]`  
  - AC4.5.5 **Dado** un guardado con `updatedAt` desactualizado **Entonces** responde 409 `CONFLICT` y se conserva lo escrito, como en AC1.7.8. `[agente]`  
  - AC4.5.6 **Dado** un viewport de 375 px **Entonces** la pantalla es operable sin desbordamiento horizontal. `[agente]`  
  - AC4.5.7 **\[Debe NOT\]** No hay editor WYSIWYG ni HTML (el cuerpo es texto plano con párrafos) y no se crean páginas adicionales desde el panel. `[agente]`

---

## ÉPICA 5: Servicios Públicos, Nosotros, Contacto, Páginas Legales y Manejo de Errores

### US5.1 — Índice y Páginas de Servicios de Ingeniería y Arquitectura

- **Responsable:** \[ Dev 2 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Criterios de aceptación:**  
  - AC5.1.1 **Dado** `/servicios` **Entonces** muestra una tarjeta por cada servicio `ACTIVE`, ordenados por `orden`; sin servicios activos, muestra un estado vacío en el idioma de la página, sin error. `[agente]`  
  - AC5.1.2 **Dado** una tarjeta (p. ej. *Estudios de Suelo*, *Cálculos Estructurales*) **Cuando** la selecciono **Entonces** llego a `/servicios/[slug]` con detalle técnico, galería de proyectos realizados y un botón de cotización directa por WhatsApp (helper T3, mensaje con el título del servicio). `[agente]`  
  - AC5.1.3 **Dado** un slug inexistente, `HIDDEN` o `DELETED` **Entonces** responde 404\. `[agente]`  
  - AC5.1.4 **\[Debe NOT\]** No hay formulario de cotización, calendario de agendamiento ni manejo o control de pagos. `[agente]`

### US5.2 — Pie de Página y Página de Contacto

- **Responsable:** \[ Dev 2 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** `/contacto` es una página informativa (su redacción es una propuesta; ver N1). El formulario es solo el de US3.1.  
- **Criterios de aceptación:**  
  - AC5.2.1 **Dado** cualquier página pública **Entonces** el footer muestra enlaces a Nosotros y Contacto en el idioma actual (`/es/nosotros` o `/en/about-us`; `/es/contacto` o `/en/contact`), los datos de contacto desde `NEXT_PUBLIC_CONTACT_*`, los enlaces legales y el selector de idioma. `[agente]`  
  - AC5.2.2 **Dado** `/contacto` **Entonces** muestra los mismos datos de contacto, un botón de WhatsApp (helper T3) y un enlace a «Consigne su propiedad». `[agente]`  
  - AC5.2.3 **\[Debe NOT\]** No hay formulario en `/contacto` ni teléfonos o direcciones literales en el código. `[agente]`

### US5.3 — Páginas Legales

- **Responsable:** \[ Dev 2 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** son texto estático del código (no pasan por US0.5).  
- **Criterios de aceptación:**  
  - AC5.3.1 **Dado** `/aviso-de-privacidad`, `/politica-de-tratamiento-de-datos` y `/terminos` **Entonces** cada una renderiza contenido real en español, marcado como borrador pendiente de revisión jurídica. `[agente]`  
  - AC5.3.2 **Dado** esas páginas en inglés **Entonces** muestran una traducción de cortesía (generada por el mismo servicio usado en el resto de la web) e indican que prevalece la versión en español. `[agente]`  
  - AC5.3.3 **Dado** la Política de Tratamiento de Datos **Entonces** declara que los datos enviados por formulario no se almacenan en la plataforma y se transmiten por correo mediante un proveedor (Resend). `[agente]`  
  - AC5.3.4 **Dado** el lanzamiento a producción **Entonces** la revisión jurídica de estos textos está completada y el aviso de «borrador» retirado. `[manual]`  
  - AC5.3.5 **\[Debe NOT\]** No contienen lorem ipsum ni se presentan como asesoría legal. `[agente]`

### US5.4 — Cliente HTTP Centralizado y Gestión Estándar de `ApiError`

- **Responsable:** \[ Fullstack \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** normalización del manejo de errores en el cliente. El `code` se traduce a un mensaje amigable propio; nunca se muestra el `message` del backend directo.  
- **Criterios de aceptación:**  
  - AC5.4.1 **Dado** una respuesta `{ success: false, data: { code, requestId, details }, message }` **Cuando** la recibe el cliente HTTP **Entonces** se convierte en una `ApiError` con `code`, `details`, `requestId` y `message`. `[agente]`  
  - AC5.4.2 **Dado** un `code` conocido **Entonces** se muestra el mensaje del diccionario en el idioma de la página (en español en el admin); **dado** uno desconocido, un mensaje genérico. `[agente]`  
  - AC5.4.3 **Dado** un error 422 `VALIDATION_ERROR` en un formulario **Entonces** los errores se inyectan con `form.setErrors()` y no se lanza además una notificación (el mismo error no se muestra dos veces). `[agente]`  
  - AC5.4.4 **Dado** un error en una acción de un admin **Entonces** una `notification` de Mantine (rojo suave, 10 s) muestra el mensaje y el `requestId` con botón de copiado rápido. `[agente]`  
  - AC5.4.5 **Dado** un error de un usuario público **Entonces** la notificación no contiene detalles técnicos ni el `requestId`, salvo en errores graves de página, donde aparece como «código de referencia» discreto. `[agente]`  
  - AC5.4.6 **Dado** un fallo total de carga de datos **Entonces** se muestra un bloque dentro de la página con un botón «Reintentar» (`refetch`). `[agente]`  
  - AC5.4.7 **Dado** un 401 **Cuando** falla la renovación reactiva (AC1.5.4) o no hay sesión de Firebase **Entonces** se redirige al login con un mensaje, sin mostrar error. `[agente]`  
  - AC5.4.8 **Dado** un error de render inesperado **Entonces** un `ErrorBoundary` muestra una pantalla elegante con botón de recarga. `[agente]`  
  - AC5.4.9 **Dado** errores de red o 5xx **Entonces** TanStack Query reintenta hasta 3 veces antes de mostrar una pantalla dedicada; **dado** un 4xx **Entonces** no reintenta pero si muestra pantalla dedicada. `[agente]`  
  - AC5.4.10 **Dado** `EMAIL_DELIVERY_FAILED` en el formulario de consignación **Entonces** no se muestra el error genérico: se activa el respaldo de AC3.1.5. `[agente]`  
  - AC5.4.11 **\[Debe NOT\]** Ningún mensaje técnico ni stack llega al usuario final. `[agente]`

### US5.5 — Configuración de Contacto Editable desde el Panel

- **Responsable:** \[ Fullstack \] · **Prioridad:** COULD (se desarrolla solo si sobra tiempo) · **Estado:** \[ \]  
- **Descripción:** hoy el número de WhatsApp y el correo destino de consignaciones vienen de variables de entorno (v1). Esta historia los mueve a la base de datos.  
- **Criterios de aceptación:**  
  - AC5.5.1 **Dado** `/admin/configuracion` **Entonces** el admin edita el número de WhatsApp y el email principal (destino de las consignaciones). `[agente]`  
  - AC5.5.2 **Dado** que existen estos valores en la base de datos **Entonces** reemplazan a `NEXT_PUBLIC_WHATSAPP_NUMBER` y a `CONSIGNMENT_TO_EMAIL`, que quedan como valor de respaldo si el documento no existe. `[agente]`  
  - AC5.5.3 **Dado** un cambio guardado **Entonces** el sitio lo refleja tras la revalidación (US0.3). `[agente]`  
  - AC5.5.4 **Dado** los campos **Entonces** se valida que el número tenga formato internacional y que el email sea válido. `[agente]`  
  - AC5.5.5 **\[Debe NOT\]** No se añaden otros ajustes (no es un CMS genérico de configuración). `[agente]`

### US5.6 — Página «Nosotros»

- **Responsable:** \[ Dev 2 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** página amplia con la visión, misión, descripción, objetivos, propósito y todo lo que el cliente quiera contar de su empresa y su equipo. Las secciones son libres (no hay una lista fija). La portada (home de la web) solo muestra el extracto (AC2.6.4). El contenido vive en `pages/nosotros` y se edita desde US4.5.  
- **Criterios de aceptación:**  
  - AC5.6.1 **Dado** `/nosotros` (`/en/about-us`) **Entonces** muestra el título, las secciones en su orden (título y cuerpo en párrafos) y el equipo (foto con el derivado de 640 px, nombre, cargo y descripción), y no renderiza lo que no exista. `[agente]`  
  - AC5.6.2 **Dado** un integrante sin foto **Entonces** se muestra un avatar neutro con sus iniciales, sin imagen rota. `[agente]`  
  - AC5.6.3 **Dado** que no hay secciones ni equipo **Entonces** la página muestra un estado vacío en el idioma de la página, sin error, y el acceso del menú sigue siendo válido. `[agente]`  
  - AC5.6.4 **Dado** la página **Entonces** cumple el SEO de US2.7 (título y descripción tomados de `titulo` y `extracto`, `hreflang`, presencia en el sitemap) y las reglas de traducción de AC0.4.5. `[agente]`  
  - AC5.6.5 **\[Debe NOT\]** El contenido de la empresa no está escrito en JSX ni en los diccionarios, no hay texto inventado sobre la empresa y los cuerpos no se renderizan con `dangerouslySetInnerHTML`. `[agente]`

---

## ÉPICA 6: Plataforma, Datos de Ejemplo y Operación

### US6.1 — Datos de Ejemplo Reproducibles

- **Responsable:** \[ Dev 1 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Criterios de aceptación:**  
  - AC6.1.1 **Dado** `npm run seed` ejecutado dos veces **Entonces** la segunda informa 0 cambios (idempotente). `[agente]`  
  - AC6.1.2 **Dado** el resultado **Entonces** hay hasta 20 inmuebles repartidos en venta, alquiler y proyectos, con al menos 13 `ACTIVE` en `VENTA` (para ejercitar el scroll infinito) y precios variados, al menos 1 `HIDDEN`, 1 `destacada`, 1 con `createdAt` dentro de los últimos 30 días (para ejercitar la insignia «Nuevo»), un proyecto sobre planos con sus campos propios, algunos con `en` completo y otros sin él, algunos servicios y un documento Nosotros de ejemplo con 2 secciones y 2 integrantes (texto de ejemplo, sin afirmaciones inventadas sobre la empresa). `[agente]`  
  - AC6.1.3 **Dado** el inmueble `HIDDEN` sembrado **Entonces** responde 404 en la web pública y queda fuera de todo listado. `[agente]`  
  - AC6.1.4 **\[Debe NOT\]** No se descargan imágenes de internet (las de *Placeholder* se generan localmente), no hay fotos de personas reales, direcciones o teléfonos reales, y el seed no llama al servicio de traducción (usa el traductor falso de AC0.5.9). `seed:reset` es la única ruta destructiva y se invoca explícitamente. `[agente]`

### US6.2 — Costos y Presupuesto Bajo Control

- **Responsable:** \[ Dev 1 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Criterios de aceptación:**  
  - AC6.2.1 **Dado** el proyecto en Blaze **Cuando** está listo para desplegar **Entonces** existe una alerta de presupuesto creada. `[manual]`  
  - AC6.2.2 **Dado** el diseño de datos **Entonces** solo hay índices compuestos para las combinaciones documentadas (US1.10) y cero (0) `AggregationQuery`. `[agente]`  
  - AC6.2.3 **Dado** la documentación **Entonces** deja claro que la alerta de presupuesto no corta el consumo ni los cargos. `[agente]`  
  - AC6.2.4 **Dado** la documentación **Entonces** lista los servicios facturables (Firebase App Hosting, Functions, Firestore, **Google Cloud Translation**, Cloudflare R2, Resend…) y aclara que el objetivo de \$0 mensual depende de mantenerse dentro de las cuotas gratuitas vigentes bajo uso normal. `[agente]`  
  - AC6.2.5 **\[Debe NOT\]** Ningún secreto en texto plano en el repositorio. `[agente]`

### US6.3 — Despliegue y Documentación

- **Responsable:** \[ Fullstack \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Criterios de aceptación:**  
  - AC6.3.1 **Dado** `firestore.indexes.json` **Cuando** se despliega **Entonces** los índices se aplican sin error. `[agente]`  
  - AC6.3.2 **Dado** el README **Cuando** lo sigo desde un clon limpio **Entonces** llego a un servidor de desarrollo con datos sembrados. `[agente]`  
  - AC6.3.3 **Dado** cada `process.env.*` referenciado **Entonces** está documentado. `[agente]`  
  - AC6.3.4 **Dado** `ADMIN-GUIDE.md` **Entonces** está íntegramente en español y explica cómo subir fotos, cambiar la portada, editar inmuebles, crear servicios y editar la página Nosotros, y aclara que el inglés se genera al guardar cuando la traducción automática está activa (interruptores por campo y global en el editor de inmuebles), que puede editarse a mano, y qué hacer si queda «traducción pendiente». `[agente]`  
  - AC6.3.5 **Dado** `apphosting.yaml` **Entonces** define las variables públicas (`NEXT_PUBLIC_*`) y los secretos se inyectan vía **Secret Manager**, sin aparecer en texto plano en el repositorio ni en `apphosting.yaml`. `[agente]`  
  - AC6.3.6 **Dado** un despliegue de Next.js en Firebase App Hosting **Entonces** el BFF alcanza Functions y la revalidación (US0.3) alcanza la app, ambos dentro del mismo proyecto de Firebase. `[agente]`  
  - AC6.3.7 **\[Debe NOT\]** No se despliega a producción sin el visto explícito del cliente/propietario del proyecto. `[manual]`

---

## ÉPICA 7: Mobile First y Uso Eficiente de Datos (transversal a todo el monorepo)

> **Principio rector:** el sitio público y el panel de administración se diseñan, construyen y miden primero para un móvil de gama media en red 4G regular (con el CPU equivalente a 4× más lento). El escritorio es una mejora progresiva, no el caso base.
> **Regla de diseño:** las reglas nuevas de esta épica conviven con las ya abiertas en US2.1 (AC2.1.5, AC2.1.8); cuando un AC de esta épica extiende uno existente, lo indica explícitamente.
> **Regla de integración:** la Épica 7 no tiene ola propia. Sus exigencias se inyectan como AC en las MT que implementan cada superficie (MT0.4, MT2.2, MT2.3, MT4.1, MT4.2, MT5.1) y sus gates numéricos cierran en MT6.2. Los presupuestos viven en `./PERFORMANCE.md`.

### US7.1 — Interfaz Mobile First

- **Responsable:** \[ Dev 2 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** los estilos base se escriben para pantallas de 320 a 414 px; lo específico de escritorio se añade después con `min-width` como mejora. Aplica a las rutas públicas (US0.4) y al panel `/admin`.  
- **Criterios de aceptación:**  
  - AC7.1.1 **Dado** cualquier hoja de estilos **Entonces** los estilos base son los del móvil y los ajustes de escritorio se declaran solo con `min-width: 768px` y `min-width: 1024px`, nunca con `max-width`. `[agente]`  
  - AC7.1.2 **Dado** el elemento `viewport` del head **Entonces** incluye `width=device-width, initial-scale=1` y no bloquea el zoom del usuario (sin `user-scalable=no` ni `maximum-scale=1`). `[agente]`  
  - AC7.1.3 **Dado** cualquier control interactivo (botones, enlaces, íconos, casillas, filtros) **Entonces** su área táctil es de al menos 44 × 44 px y hay al menos 8 px de separación entre controles adyacentes (regla general; AC2.1.5 ya la aplicaba al menú móvil). `[agente]`  
  - AC7.1.4 **Dado** cualquier campo de formulario público o de `/admin` **Entonces** el texto de entrada mide al menos 16 px (evita el zoom automático en iOS) y usa `inputmode`/`type` adecuado (`tel`, `email`, `numeric`, `decimal`) según el dato. `[agente]`  
  - AC7.1.5 **Dado** cualquier interacción que dependa de hover **Entonces** solo se activa dentro de `@media (hover: hover) and (pointer: fine)`; en dispositivo táctil la misma acción es accesible con un toque. `[agente]`  
  - AC7.1.6 **Dado** un header, panel o botón fijo **Entonces** respeta `env(safe-area-inset-*)` (notch y barra inferior del navegador) en lugar de asumir bordes de pantalla rectos. `[agente]`  
  - AC7.1.7 **Dado** la acción principal de cada página pública (llamar, WhatsApp, consignar, enviar) **Entonces** es alcanzable con el pulgar: ancho completo o fijada en la zona visible sin necesidad de hacer scroll hasta el final de la página. `[agente]`  
  - AC7.1.8 **Dado** las páginas públicas y el panel `/admin` con anchos de 320, 375 y 414 px **Entonces** extiende AC2.1.8: además de no haber desplazamiento horizontal, el cuerpo del texto mide al menos 16 px (legible sin zoom) y ningún elemento ni texto queda cortado. `[agente]`  
  - AC7.1.9 **\[Debe NOT\]** No hay funcionalidad disponible solo en escritorio ni comportamiento condicionado por el User-Agent del dispositivo. `[agente]`

### US7.2 — Presupuesto de Rendimiento y de Datos

- **Responsable:** \[ Fullstack \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** el rendimiento se mide siempre con el perfil móvil regular descrito en `./PERFORMANCE.md` (red 4G regular + CPU 4× más lenta). Los valores numéricos de este US son los iniciales; se calibran con la primera medición real y la versión vigente vive en `./PERFORMANCE.md`.  
- **Criterios de aceptación:**  
  - AC7.2.1 **Dado** las rutas públicas de US0.4 (`/es`, `/es/venta`, `/es/alquiler`, `/es/proyectos`, `/es/propiedad/[slug]`, `/es/servicios`, `/es/servicios/[slug]`, `/es/nosotros`, `/es/consigne-su-propiedad`, `/es/contacto` y las legales `/es/aviso-de-privacidad`, `/es/politica-de-tratamiento-de-datos`, `/es/terminos`, con sus equivalentes `/en/...`), medidas con Lighthouse perfil móvil (ver `./PERFORMANCE.md`) **Entonces** cada una cumple: puntuación ≥ 85, LCP ≤ 2,5 s, CLS ≤ 0,1 y TBT ≤ 300 ms; la ficha se mide sobre un slug de los datos de ejemplo (US6.1). `[agente]`  
  - AC7.2.2 **Dado** el listado inicial (`/es/venta`, `/es/alquiler` o `/es/proyectos`, con sus equivalentes `/en/...`) **Entonces** el JavaScript hidratado de la primera carga pesa ≤ 200 KB comprimido y el total de la página (HTML + CSS + JS + fuentes) ≤ 1 MB comprimido. `[agente]`  
  - AC7.2.3 **Dado** una ficha (`/propiedad/[slug]`) **Cuando** es interactiva **Entonces** el total descargado hasta ese momento pesa ≤ 1,5 MB comprimido (sin contar video/360° que el usuario dispare después). `[agente]`  
  - AC7.2.4 **Dado** el bundle de idioma **Entonces** solo se sirve el diccionario del idioma activo de la ruta (es o en, US0.4), nunca ambos. `[agente]`  
  - AC7.2.5 **Dado** el uso de fuentes **Entonces** son solo `next/font`, subconjunto latino, máximo 2 familias y el mínimo de pesos necesarios, con `font-display: swap`; el presupuesto exacto por familia está documentado en `./PERFORMANCE.md`. `[agente]`  
  - AC7.2.6 **Dado** el bundle de las rutas públicas **Entonces** no incluye código de `/admin`, ni el SDK de Firebase en el cliente donde no aplique, ni Pannellum (se carga dinámico solo al abrir el visor 360°, AC2.4.7); los íconos se importan uno a uno, no por paquete completo. `[agente]`  
  - AC7.2.7 **Dado** una visita normal a una página pública **Entonces** hay ≤ 6 peticiones al servidor propio además de las imágenes, y ninguna petición a recursos de terceros. `[agente]`  
  - AC7.2.8 **Dado** una pull request **Cuando** incumple AC7.2.1, AC7.2.2 o AC7.2.3 **Entonces** el CI falla (gates configurados en MT6.2, valores y cómo verificarlos en `./PERFORMANCE.md`). `[agente]`  
  - AC7.2.9 **\[Debe NOT\]** No se cargan scripts de terceros antes de una interacción explícita del usuario (p. ej. no hay Google Analytics, tag managers ni embeds en la carga inicial). `[agente]`

### US7.3 — Imágenes y Multimedia Bajo Demanda

- **Responsable:** \[ Dev 2 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** aprovecha los derivados de US1.9 (320/640/1280/2048) para servir a cada contexto la variante pequeña que le basta.  
- **Criterios de aceptación:**  
  - AC7.3.1 **Dado** cualquier `<img>` del público **Entonces** declara `srcset` con los derivados 320, 640, 1280 y 2048 y un `sizes` coherente con el ancho real del contenedor. `[agente]`  
  - AC7.3.2 **Dado** una tarjeta de listado en móvil (contenedor ≤ 375 px) **Entonces** como máximo se descarga el derivado 640 (coherente con AC2.2.11). `[agente]`  
  - AC7.3.3 **Dado** la galería de una ficha en móvil **Entonces** como máximo se descarga el derivado 1280; el 2048 solo se usa si el ancho de la pantalla lo exige o en el visor modal de escritorio (ajusta AC2.4.5). `[agente]`  
  - AC7.3.4 **Dado** una página con varias imágenes **Entonces** solo la imagen principal de la portada lleva `priority`; el resto usa `loading="lazy"` y `decoding="async"`. `[agente]`  
  - AC7.3.5 **Dado** cualquier `<img>` **Entonces** declara `width`/`height` o `aspect-ratio` explícito para que el CLS sea cero (AC2.2.8). `[agente]`  
  - AC7.3.6 **Dado** una ficha en móvil **Entonces** descarga la primera foto y las miniaturas visibles de la tira; el resto de fotos se descarga al deslizar la galería, no antes. `[agente]`  
  - AC7.3.7 **Dado** un inmueble con video o recorrido 360° **Entonces** no se descarga nada hasta que el usuario toca su miniatura (video, AC2.4.6) o pulsa «Ver en 360°» (AC2.4.7), y en móvil la acción indica que es una carga más pesada. `[agente]`  
  - AC7.3.8 **Dado** un navegador con `Save-Data` activo **Entonces** el cliente pide directamente el derivado inmediatamente menor disponible y no precarga imágenes fuera de viewport (mejora progresiva, sin romper la experiencia). `[agente]`  
  - AC7.3.9 **Dado** la calidad de compresión de los derivados **Entonces** está documentada en `./PERFORMANCE.md` (rango inicial 75–80) y el derivado 640 usado en tarjetas pesa en promedio ≤ 60 KB (ajusta US1.9). `[agente]`  
  - AC7.3.10 **\[Debe NOT\]** No hay peticiones a `/_next/image`; `next/image` solo se usa con un loader propio que sirve desde R2 (o `images.unoptimized` global); cualquier `<img>` nativo que sustituya a `next/image` DEBE llevar `srcset`, `sizes`, `width`/`height`, `loading` y `decoding`; no hay GIF animados ni video de fondo en la portada. `[agente]`

### US7.4 — API y Caché Eficientes para Datos Móviles

- **Responsable:** \[ Dev 1 \] y \[ Dev 2 \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** respuestas ligeras, caché larga donde el dato lo permite y cero peticiones redundantes; el listado carga solo lo que la tarjeta muestra.  
- **Criterios de aceptación:**  
  - AC7.4.1 **Dado** `shared-types` **Entonces** define los tipos `PropertyCard` y `PropertyDetail`, y los listados (AC1.10.1) devuelven solo `PropertyCard`: sin `descripcion`, sin `puntosInteres` y sin la lista completa de fotos. `[agente]`  
  - AC7.4.2 **Dado** la respuesta de 12 tarjetas (una página del listado) **Entonces** su JSON pesa ≤ 30 KB sin comprimir. `[agente]`  
  - AC7.4.3 **Dado** el HTML, JSON, CSS y JS servidos **Entonces** llevan compresión Brotli (o gzip como mínimo). `[agente]`  
  - AC7.4.4 **Dado** los assets con hash de nombre **Entonces** se sirven con `Cache-Control: public, max-age=31536000, immutable`; los derivados de R2 usan caché larga y su clave cambia cuando la imagen cambia (AC1.9.1). `[agente]`  
  - AC7.4.5 **Dado** una página pública **Cuando** es revalidada por ISR/CDN (US0.3) **Entonces** una visita normal no ejecuta ninguna Function de Firebase. `[agente]`  
  - AC7.4.6 **Dado** TanStack Query **Entonces** los listados usan `staleTime` ≥ 60 s, `refetchOnWindowFocus: false` y no se repiten peticiones mientras la caché esté fresca. `[agente]`  
  - AC7.4.7 **Dado** los enlaces de tarjetas y navegación del público **Entonces** no tienen prefetch automático (`prefetch={false}`); solo se precarga al presionar o, en escritorio, al hover con puntero fino. `[agente]`  
  - AC7.4.8 **Dado** el scroll infinito del listado (US2.3) **Entonces** el disparador está cerca del final y nunca hay dos páginas cargándose a la vez. `[agente]`  
  - AC7.4.9 **Dado** cualquier campo con sugerencias o autocompletado (facetas de departamento, municipio o tipo) **Cuando** el usuario escribe **Entonces** el cliente aplica debounce de 300 ms y cancela la petición anterior al enviar la nueva. `[agente]`  
  - AC7.4.10 **Dado** una petición al servidor propio **Cuando** supera los 15 s **Entonces** el cliente muestra un mensaje en español con opción de reintento y no bloquea el resto de la página (US5.4). `[agente]`  
  - AC7.4.11 **\[Debe NOT\]** No se envía el catálogo completo en una sola respuesta ni se piden datos que la vista no muestra. `[agente]`

### US7.5 — Panel de Administración y Subidas con Datos Móviles

- **Responsable:** \[ Fullstack \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** el panel es usable desde un móvil sobre red móvil: subidas reducidas antes de viajar, reanudables y sin bloquear el formulario.  
- **Criterios de aceptación:**  
  - AC7.5.1 **Dado** una foto seleccionada en el editor (US4.2) **Cuando** se prepara la subida **Entonces** el navegador reduce su lado mayor a como máximo 2048 px y la recomprime antes de enviarla; es el comportamiento por defecto y no una opción (implementación en AC4.2.9). `[agente]`  
  - AC7.5.2 **Dado** la reducción previa en el navegador **Entonces** nunca amplía la imagen ni reduce el lado mayor por debajo de 800 px, y la panorámica conserva proporción 2:1 con lado mayor ≤ 4096 px (US1.9). `[agente]`  
  - AC7.5.3 **Dado** una carga con varias fotos **Entonces** se envían como máximo 2 en paralelo, con barra de progreso individual y reintento por foto (AC4.2.6). `[agente]`  
  - AC7.5.4 **Dado** que se corta la conexión durante una subida **Entonces** la foto fallida ofrece «Reintentar», las demás continúan y el formulario conserva lo ya cargado. `[agente]`  
  - AC7.5.5 **Dado** el editor de un inmueble **Entonces** guarda un borrador local de lo no guardado y lo descarta al guardar con éxito. `[agente]`  
  - AC7.5.6 **Dado** el panel sin conexión **Entonces** muestra un aviso persistente en español y deshabilita las acciones de red, sin perder lo escrito en el formulario. `[agente]`  
  - AC7.5.7 **Dado** las listas del panel (inmuebles, servicios) **Entonces** siguen la política de US7.4: tarjetas ligeras, cargadas por páginas y sin respuestas monolíticas. `[agente]`  
  - AC7.5.8 **\[Debe NOT\]** No se suben originales sin reducir ni se bloquea el formulario completo por el fallo de una foto. `[agente]`

### US7.6 — Calidad Mobile First en Pruebas y CI

- **Responsable:** \[ Fullstack \] · **Prioridad:** MUST · **Estado:** \[ \]  
- **Descripción:** la calidad móvil no se verifica al final: el default de toda la batería de pruebas es un dispositivo móvil emulado.  
- **Criterios de aceptación:**  
  - AC7.6.1 **Dado** Playwright **Cuando** corre la suite e2e **Entonces** el proyecto por defecto es móvil: 375 × 667, hasTouch y red equivalente a 4G regular, y todas las e2e se ejecutan ahí. `[agente]`  
  - AC7.6.2 **Dado** Playwright **Entonces** existe un segundo proyecto de escritorio (1280 px) reservado al smoke test, no a la suite completa. `[agente]`  
  - AC7.6.3 **Dado** el CI (MT6.2) **Entonces** ejecuta Lighthouse móvil sobre las rutas de AC7.2.1 y el análisis de bundles, y falla la build si se incumple algún presupuesto (AC7.2.8, valores en `./PERFORMANCE.md`). `[agente]`  
  - AC7.6.4 **Dado** cualquier historia nueva o modificada **Cuando** se marca como terminada **Entonces** su DoD exige haberla verificado a 375 px y en red lenta antes de considerar la versión de escritorio. `[agente]`  
  - AC7.6.5 **Dado** `./PERFORMANCE.md` **Entonces** documenta el presupuesto completo, el perfil de medición y cómo ejecutar cada verificación en local. `[agente]`  
  - AC7.6.6 **Dado** la entrega de una release **Entonces** alguien verifica en un Android real de gama media los flujos clave: listado con filtros, ficha, consignación y carga de una foto en el panel. `[manual]`  
  - AC7.6.7 **\[Debe NOT\]** No se da por terminada ninguna historia verificando solo en escritorio ni sin pasar por el perfil móvil regular. `[agente]`

---

## FUERA DE ALCANCE (v1)

Blog, editor WYSIWYG, boletín informativo, páginas `/requisitos` y `/pot`, mapa interactivo, estado de disponibilidad (vendido/alquilado), inicio de sesión con correo y contraseña, notificación automática a WhatsApp, pasarela de pagos, subida de videos como archivo, formulario de cotización de servicios, exportación de datos, bandeja, guardado o gestión de leads, campo, catálogo o filtro de sector, glosario de términos del traductor, panel de administración en inglés.

---

## SUPUESTOS ADOPTADOS

1. La lista blanca de administradores vive en la colección `authorized_users` de Firestore (`email`, `role`, `active`, `createdAt`) y la verifica el **backend** al crear la sesión (a petición del BFF); no hay blocking functions ni Identity Platform, y el inicio de sesión es solo con Google.  
2. `DRAFT` descartado: se crea en `HIDDEN` y se valida al activar (US1.7).  
3. Cada inmueble tiene una sola `operacion` (`VENTA`, `ALQUILER` o `PROYECTO_SOBRE_PLANOS`); no hay operación secundaria ni `precioArriendo`. `precio` es el valor de venta o el canon mensual, en COP enteros.  
4. El listado se ordena por `createdAt` descendente, con los destacados primero en las pestañas (dos consultas: `destacada=true` y luego `destacada=false`), y las destacadas de portada por `fechaPublicacion` descendente (US1.10).  
5. Límites de media: 10 MB por foto, lado mayor mínimo 800 px, panorámica de 25 MB y máximo 3 por inmueble (US1.9, US4.3).  
6. Los logos de aliados viven en un componente de la portada, no en base de datos (US2.6).  
7. Campos propios de un proyecto sobre planos: etapa, mes y año de entrega estimada y unidades disponibles (US2.4, US4.1).  
8. El panel de administración es solo en español (la interfaz; el contenido en inglés es editable en el editor de inmuebles). El contenido público es bilingüe: se escribe en español y el inglés se genera al guardar (D22, US0.5) o se edita manualmente; no al activar.  
9. En el formulario de consignación son obligatorios nombre, teléfono, email, tipo de inmueble, ubicación y consentimiento (US3.1).  
10. El contenido de Nosotros vive en Firestore con secciones libres; los textos y fotos los entrega el cliente (D25).
