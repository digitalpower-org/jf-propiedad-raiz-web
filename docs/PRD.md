# docs/PRD.md
# Documento de Requisitos de Producto (PRD)

**Producto:** Plataforma web y CMS de `jfpropiedadraiz.com` (JF Propiedad Raíz, Valle de Aburrá)
**Versión:** 2.1 · 22 de octubre de 2026
**Alcance y criterios de aceptación:** `docs/TASKS.md` es la **fuente de verdad**. Este PRD describe el producto en términos de valor y alcance, resume las historias de usuario y remite a TASKS para los AC completos, el modelo de datos y las decisiones en detalle. Ante cualquier conflicto entre documentos, gana TASKS.
**Docs de cierre y medición:** `docs/DEFINITION-OF-DONE.md` (reglas de aceptación de cada historia) y `docs/PERFORMANCE.md` (presupuestos de rendimiento y de datos).
**Nota de revisión:** este documento sustituye al PRD placeholder anterior, que contradecía decisiones cerradas de `docs/TASKS.md`: sin Custom Claims en el login, hasta 5 administradores (no 2), sin teléfonos hardcodeados, consignación = correo con respaldo manual por WhatsApp (no doble destino automático), incluye Proyectos y Servicios en la estructura y no existe el concepto de «lead».

---

## 1. Producto y propósito

JF Propiedad Raíz necesita una web propia que publique su catálogo de inmuebles del Valle de Aburrá y sus servicios de ingeniería y arquitectura. El producto es una plataforma **bilingüe** (es-CO por defecto, `en` como segundo idioma) para `jfpropiedadraiz.com`, compuesta por tres piezas:

1. **Catálogo público** con pestañas de operación (Venta, Alquiler, Proyectos), buscador con filtros sobre 8 combinaciones soportadas, ficha de inmueble rica (galería con derivados, videos de YouTube, panorámicas 360°, puntos de interés) y contacto directo por WhatsApp.
2. **CMS privado en `/admin`**, en español, para que un equipo reducido gestione inmuebles, servicios y la página Nosotros, con traducción automática ES→EN configurable por campo al guardar.
3. **Backend propio** en Firebase Functions con Clean Architecture, al que el navegador solo llega a través de un BFF de Next.js. Las páginas públicas se sirven con ISR y se revalidan bajo demanda tras cada escritura, en ambos idiomas.

El sitio no vende, no cotiza ni cobra en línea. Su función es mostrar el catálogo con calidad y convertir el interés en una conversación de WhatsApp o en una solicitud de consignación que llega por correo.

---

## 2. Usuarios

### 2.1 Visitante público (sin cuenta)

- Recorre las pestañas `/venta`, `/alquiler` y `/proyectos`, filtra por tipo, ubicación (departamento + municipio juntos), rango de precio y el resto de criterios en el navegador, y navega con scroll infinito.
- Abre la ficha de un inmueble, revisa características, galería, videos y recorridos 360°, y pregunta por WhatsApp con un solo botón (número desde variable de entorno, nunca literal en el código).
- Consigna su propiedad desde el **único formulario del sitio** (US3.1), con consentimiento obligatorio; el envío genera correos, no guarda datos del solicitante.
- Consulta servicios, la página Nos contacto, la página Nosotros y las páginas legales, en su idioma. Los precios siempre están en COP, sin decimales, con formato según el idioma.

### 2.2 Administrador (CMS `/admin`)

- Hasta **5 administradores** (US4.1). Inicio de sesión **solo con Google**; no hay correo y contraseña ni registro público.
- El acceso lo decide la colección `authorized_users` de Firestore (`email`, `role`, `active`, `createdAt`), verificada por el **backend** en el canje de sesión (US1.1, D27). Quitar a alguien es `active = false`; el corte surte efecto al expirar la cookie vigente, con una ventana de hasta **65 minutos** (D29).
- La sesión del BFF es la cookie `__session` (HttpOnly, D33) con JWT propio (HS256, expiración 65 min). En la v1 el único rol es `admin` (US1.12, roles múltiples, es COULD).
- Gestiona inmuebles (crear, editar, activar, ocultar, eliminar con soft delete), fotos con reordenamiento y portada, videos y panorámicas, servicios y la página Nosotros; el panel es usable desde celular (verificado a 375 px).
- La interfaz del panel está **solo en español**; el contenido en inglés de los inmuebles es editable a mano y la traducción automática ES→EN se controla por campo con interruptores (activada por defecto).

---

## 3. Estructura del sitio

Rutas públicas, siempre en `/es/...` y `/en/...` con nombres traducidos (US0.4):

| Sección | Contenido | Origen del contenido |
| :---- | :---- | :---- |
| Portada | Hero con accesos a Venta/Alquiler/Proyectos, franja «Destacadas», previa de servicios, bloque «Nosotros» con extracto, logos de aliados en código | Firestore + componente de código |
| Venta / Alquiler / Proyectos | Listados independientes por `operacion`, con filtros y scroll infinito | Firestore (`status = ACTIVE`) |
| Ficha de inmueble | Galería, código, precio, características, puntos de interés, videos, 360°, botón WhatsApp | Firestore |
| Servicios | Índice y detalle por slug, con galería de obras y botón de cotización por WhatsApp | CRUD del admin (D10) |
| Nosotros | Página amplia con secciones libres y equipo; la portada solo muestra el extracto (D25) | Documento Firestore `pages/nosotros` |
| Consigne su Propiedad | El único formulario del sitio; genera correos, sin persistencia (D5, D11) | No almacena datos |
| Contacto | Página informativa con datos desde variables de entorno, botón WhatsApp y enlace a consignación; sin formulario | Variables `NEXT_PUBLIC_CONTACT_*` |
| Legales | Aviso de privacidad, política de tratamiento de datos y términos, con revisión jurídica antes de producción | Texto estático del código |

Además del segmento de idioma, `/` redirige a `/es` o `/en` según `Accept-Language`, con español por defecto; `/admin` y `/api/**` no se localizan.

---

## 4. Alcance por épicas (resumen de historias)

Prioridades según TASKS: **MUST** bloquea el lanzamiento · **SHOULD** se espera en la v1 · **COULD** diferible. Los AC completos (formato Dado/Cuando/Entonces) viven en `docs/TASKS.md`; aquí solo se resume cada historia.

### Épica 0: Fundamentos transversales

| US | Resumen | Prioridad |
| :---- | :---- | :---- |
| US0.1 Contrato de API, respuesta estándar y catálogo de códigos | Envoltura `{ success, data, message }`, errores `{ success: false, data: { code, details, requestId }, message }` y una única tabla de códigos en `shared-types` (validación = 422) | MUST |
| US0.2 BFF de Next.js y seguridad de la llamada al backend | El navegador solo consume la superficie pública del BFF (`/api/*`, D31); el BFF envía `X-Internal-Key` y la IP del cliente; Functions rechaza sin clave y no emite CORS | MUST |
| US0.3 Revalidación bajo demanda | Tras cada escritura, Functions avisa a Next.js (`revalidatePath`/`revalidateTag`) en ambos idiomas; si la revalidación falla, la escritura no se revierte | MUST |
| US0.4 Internacionalización por rutas | Rutas `/es` y `/en` con tabla fija, redirección por `Accept-Language`, selectores que conservan slug y filtros, `messages/*.json` con claves idénticas, fallback al español y `noindex` si falta traducción obligatoria | MUST |
| US0.5 Traducción del contenido ES→EN | El backend traduce por lote solo los campos con `autoTranslate` activo cuyo `es` cambió o cuyo `en` está vacío; puerto `Translator` con Google Cloud Translation; estados «Actualizada» y «Pendiente»; nunca en peticiones públicas | SHOULD |

### Épica 1: Autenticación, seguridad y dominio backend

| US | Resumen | Prioridad |
| :---- | :---- | :---- |
| US1.1 Control de acceso por lista blanca | Solo Google; `authorized_users` verificada por el backend; sin custom claims, sin blocking functions ni Identity Platform; rechazo = 403 sin cookie | MUST |
| US1.2 POST /api/auth/session | Canje único del idToken por cookie JWT propia (HS256, 65 min, HttpOnly); el backend verifica el token y la lista blanca; el BFF no usa Firebase Admin ni persiste sesiones | MUST |
| US1.3 Guard de sesión y propagación | El BFF valida su cookie, sobrescribe siempre `X-User-*` y el backend autoriza las rutas de administrador | MUST |
| US1.4 POST /api/auth/logout | Logout bidireccional obligatorio: borra la cookie y ejecuta `signOut()` de Firebase | MUST |
| US1.5 Ciclo de sesión en el front | `/admin/**` protegido, renovación reactiva single-flight ante un 401, resincronización con `onIdTokenChanged`, ID token nunca en `localStorage` | MUST |
| US1.6 GET /api/auth/me | Confirma la sesión y sincroniza el estado cuando la cookie viva pero la sesión de Firebase se perdió | SHOULD |
| US1.7 Ciclo de vida del inmueble | Sin `DRAFT`: se crea `HIDDEN` con código `JF-XXXX`, se activa solo con campos completos, soft delete, `fechaPublicacion` fija en la primera activación y conflicto 409 por edición simultánea | MUST |
| US1.8 URLs presignadas para R2 | PUT firmado que expira en 15 min bajo `pending/`, MIME validado antes de firmar, CORS restringido; el navegador nunca ve credenciales | MUST |
| US1.9 Confirmación de subida y derivados | Validación por cabecera (tipo, peso, dimensiones, píxeles, proporción 2:1 en panorámicas), derivados WebP vía puerto `ImageProcessor`, original eliminado, ciclo de vida de `pending/` a 1 día | MUST |
| US1.10 Consulta pública del catálogo | Una sola consulta nativa de Firestore por petición: `status = ACTIVE`, operación, tipo, ubicación, rango de precio y `destacada` con un único valor; orden `createdAt` desc con desempate por `id`, cursor `{ createdAt, id }`, límite 12 (máx. 50) | MUST |
| US1.11 Vigencia de la bandera «Nuevo» | Tarea diaria (03:00 `America/Bogota`) que apaga `nuevo` a los 30 días (`NEW_FLAG_DAYS`), idempotente y sin tocar `updatedAt` | SHOULD |
| US1.12 Autorización por roles | Roles distintos de `admin` con 403 y UX de denegación. **En la v1 no aplica** (el rol siempre es `admin`) | COULD |

### Épica 2: Catálogo público y buscador

| US | Resumen | Prioridad |
| :---- | :---- | :---- |
| US2.1 Navegación por pestañas | Venta, Alquiler, Proyectos y Servicios con selector de idioma; cambiar de pestaña resetea filtros; menú móvil accesible con foco y áreas de 44×44 px | MUST |
| US2.2 Buscador con filtros | Filtros de base de datos (tipo, ubicación, precio) que piden de nuevo al backend y filtros de frontend en caliente; URL como única fuente de verdad, skeletons, estado vacío con WhatsApp, orden fijo (destacados primero y más recientes) | MUST |
| US2.3 Scroll infinito | 12 en 12 por cursor; se agota la serie `destacada = true` y luego continúa `destacada = false` con consulta nueva; botón «Cargar más» accesible; restablece scroll al volver de una ficha | SHOULD |
| US2.4 Ficha técnica con SEO | SSR/ISR con galería y visor modal, características opcionales que se ocultan si no existen, bloque de proyecto sobre planos, puntos de interés con categorías, YouTube diferido (`youtube-nocookie` en modal) y Pannellum con importación dinámica; Lighthouse ≥ 85 en móvil | MUST |
| US2.5 Botón de WhatsApp en la ficha | Un solo botón con mensaje codificado en el idioma de la página que incluye código y título; todos los enlaces del sitio pasan por el helper `buildWhatsAppUrl`; número desde `NEXT_PUBLIC_WHATSAPP_NUMBER` | MUST |
| US2.6 Portada | Hero, franja «Destacadas» (solo `ACTIVE`), previa de servicios con CTA a contacto, extracto de Nosotros, logos de aliados en componente de código; sin placeholders vacíos | SHOULD |
| US2.7 SEO técnico | `title`/`description`/`hreflang`/`x-default` por idioma, sitemap con solo inmuebles `ACTIVE`, `robots.txt` con `Disallow: /admin` y `/api`, JSON-LD de la ficha con `addressCountry: CO` | MUST |

### Épica 3: Consignación y notificaciones por correo

| US | Resumen | Prioridad |
| :---- | :---- | :---- |
| US3.1 Formulario «Consigne su Propiedad» | Único formulario del sitio; datos personales + datos del inmueble + consentimiento; sin persistencia, sin CAPTCHA; si el correo falla, se conservan los datos y aparece un botón de respaldo manual por WhatsApp | MUST |
| US3.2 Notificación con Resend | Correo HTML a Juan Fernando (con enlace `wa.me` preformateado y `Reply-To` del solicitante) y «Recibo» al solicitante; si falla el correo a Juan, 502 `EMAIL_DELIVERY_FAILED` y respaldo de US3.1 | MUST |
| US3.3 Consentimiento | Checkbox obligatorio sin premarcar; validación en el frontend y 422 `CONSENT_REQUIRED` en el backend (defensa en profundidad) | MUST |
| US3.4 Protección contra bots | Campo oculto `sitio` (honey pot) y límite de 5 envíos por minuto e IP (6.º = 429); sin CAPTCHA ni vendor | SHOULD |

### Épica 4: CMS y gestión

| US | Resumen | Prioridad |
| :---- | :---- | :---- |
| US4.1 CRUD de inmuebles | Panel para hasta 5 administradores, usable a 375 px; editor con pestañas de edición y vistas previas, par de campos ES/EN con indicador e interruptor de traducción por campo y global; activación automática al estar completo; campos de solo lectura; sin roles ni WYSIWYG | MUST |
| US4.2 Uploader de fotos | Subida directa a R2 con progreso, grilla reordenable con insignia «Portada», botones para pantallas táctiles, reintento por archivo y pre-reducción en el navegador a máximo 2048 px antes de enviar (por defecto, no opcional) | MUST |
| US4.3 Videos y panorámicas 360° | Hasta 2 URLs de YouTube validadas y hasta 3 panorámicas `.jpg` con proporción 2:1, en bloques separados de la grilla de fotos | SHOULD |
| US4.4 Gestión de servicios | CRUD completo sin cantidad fija: crear, editar, ocultar, reordenar y eliminar; mismos estados que los inmuebles; cuerpo en texto plano; editor solo en español con indicador de traducción | MUST |
| US4.5 Gestión de la página Nosotros | Documento único con `titulo`, `extracto` (máx. 500 caracteres), secciones libres y equipo, todo reordenable; traducción al guardar y control de concurrencia 409 | SHOULD |

### Épica 5: Páginas públicas y manejo de errores

| US | Resumen | Prioridad |
| :---- | :---- | :---- |
| US5.1 Índice y detalle de servicios | Tarjetas ordenadas por `orden`, detalle con galería y botón de cotización por WhatsApp; sin formulario, calendario ni pagos | MUST |
| US5.2 Footer y página de contacto | Enlaces a Nosotros y Contacto en el idioma actual, datos de contacto desde `NEXT_PUBLIC_CONTACT_*`, enlaces legales y selector de idioma; `/contacto` informativa, sin formulario ni teléfonos literales | MUST |
| US5.3 Páginas legales | Contenido real en español marcado como borrador hasta la revisión jurídica; en inglés, traducción de cortesía que indica que prevalece el español; la política declara que los datos no se almacenan y viajan por correo (Resend) | MUST |
| US5.4 Cliente HTTP y `ApiError` | Errores normalizados con diccionario de mensajes por `code`, errores de validación en el formulario sin notificación duplicada, `requestId` copiable en el admin, reintentos en red/5xx, `ErrorBoundary` y redirección a login ante un 401 irrecoverable | MUST |
| US5.5 Configuración de contacto editable | Mover WhatsApp y correo de consignaciones de variables de entorno a la base de datos, con las variables como respaldo | COULD |
| US5.6 Página Nosotros | Página amplia con título, secciones y equipo desde Firestore; estados vacíos amigables; cumple SEO y reglas de traducción; sin HTML ni contenido inventado en JSX | MUST |

### Épica 6: Plataforma, datos de ejemplo y operación

| US | Resumen | Prioridad |
| :---- | :---- | :---- |
| US6.1 Datos de ejemplo reproducibles | `npm run seed` idempotente con hasta 20 inmuebles (≥ 13 `ACTIVE` en VENTA), estados y textos de ejemplo sin datos reales; `seed:reset` es la única ruta destructiva | MUST |
| US6.2 Costos y presupuesto bajo control | Alerta de presupuesto en la consola de facturación, solo índices documentados, cero `AggregationQuery`, catálogo de servicios facturables y cero secretos en el repositorio | MUST |
| US6.3 Despliegue y documentación | Índices aplicables, README que lleva a un servidor con datos, variables documentadas, `ADMIN-GUIDE.md` en español, secretos vía Secret Manager en `apphosting.yaml` y producción solo con visto del cliente | MUST |

### Épica 7: Mobile First y uso eficiente de datos

| US | Resumen | Prioridad |
| :---- | :---- | :---- |
| US7.1 Interfaz Mobile First | Estilos base de 320 a 414 px y escritorio con `min-width`, zoom habilitado, áreas táctiles de 44×44 px, texto de 16 px, acciones principales al alcance del pulgar, sin dependencia de hover ni User-Agent | MUST |
| US7.2 Presupuesto de rendimiento y de datos | Lighthouse móvil ≥ 85 con LCP ≤ 2,5 s, CLS ≤ 0,1 y TBT ≤ 300 ms en todas las rutas públicas; JS hidratado ≤ 200 KB y página ≤ 1 MB en listados; ficha ≤ 1,5 MB; solo el diccionario del idioma activo; gates en CI. Los valores vigentes y el perfil de medición viven en `docs/PERFORMANCE.md` | MUST |
| US7.3 Imágenes y multimedia bajo demanda | `srcset` con los derivados 320/640/1280/2048, tamaños coherentes, lazy salvo la imagen principal, `Save-Data` respetado; **sin `/_next/image`** y sin GIF ni video de fondo | MUST |
| US7.4 API y caché eficientes | Listados que devuelven solo `PropertyCard` (≤ 30 KB por página de 12), Brotli, caché larga de assets, páginas revalidadas que no ejecutan Functions, `staleTime` ≥ 60 s, sin prefetch automático, debounce de 300 ms en facetas | MUST |
| US7.5 Panel y subidas con datos móviles | Máximo 2 subidas en paralelo, reintento por foto, borrador local del formulario, aviso persistente sin conexión y listas del panel ligeras | MUST |
| US7.6 Calidad Mobile First en pruebas y CI | Playwright con proyecto móvil por defecto (375×667, 4G), escritorio solo para smoke test, Lighthouse y análisis de bundles en CI, y verificación manual en Android real por release | MUST |

---

## 5. Decisiones de producto vinculantes (D1 a D31)

Resumen de la tabla de decisiones de `docs/TASKS.md`. Son vinculantes para el producto; la redacción completa está en TASKS.

| # | Tema | Decisión |
| :---- | :---- | :---- |
| D1 | Backend | Firebase Functions en `packages/functions`; sin contenedor API, sin Dockerfile ni `/healthz` |
| D2 | Acceso desde el navegador | BFF en rutas de Next.js de la superficie pública (`/api/*`, D31) que reenvía a Functions con `X-Internal-Key`; el navegador nunca llama a Functions y el BFF no valida idTokens de Firebase |
| D3 | Fotos | Cloudflare R2 con subida presignada a `pending/` y paso de confirmación; derivados WebP en el backend; sin Firebase Storage |
| D4 | Correo | Resend |
| D5 | Consignación | Un correo HTML a Juan Fernando con enlace de WhatsApp preformateado y «Recibo» al solicitante; si falla el correo a Juan, aviso en pantalla y botón de WhatsApp como acción del usuario; sin notificación automática a WhatsApp |
| D6 | Código de inmueble | `JF-XXXX` secuencial, asignado al crear |
| D7 | Estados | `ACTIVE` / `HIDDEN` / `DELETED`; sin estado de disponibilidad ni `DRAFT` |
| D8 | Navegación | Pestañas independientes `/venta`, `/alquiler`, `/proyectos` y `/servicios`. Nosotros y Contacto se enlazan desde el footer (US5.2) |
| D9 | Filtros | La operación es fija por pestaña y el listado exige `status = ACTIVE`; Firestore resuelve nativamente tipo, ubicación (departamento + municipio como un solo filtro), rango de precio y `destacada` con un único valor; el resto se filtra en el navegador; sin filtro de sector |
| D10 | Servicios | Editables desde el admin, sin cantidad fija: crear, editar, ocultar, reordenar, eliminar |
| D11 | Leads | **No existen.** Las solicitudes solo generan correos; no se guarda ni gestiona ningún dato de solicitante |
| D12 | WhatsApp en la ficha | Un solo botón; número desde variable de entorno |
| D13 | Videos | Enlaces de YouTube con carga diferida (miniatura y modal) |
| D14 | Panorámicas 360° | Archivos `.jpg` en R2 con Pannellum, cargado dinámicamente y solo al abrir |
| D15 | Forma de errores | Envoltura estándar con `success`, `data` y `message`; validación = HTTP 422 `VALIDATION_ERROR` |
| D16 | Hosting del frontend | Next.js en Firebase App Hosting, en el mismo proyecto de Firebase que Functions, Firestore y Auth |
| D17 | Orden e índices | Orden siempre por `createdAt` descendente con desempate por `id`; dos consultas por pestaña (primero `true`, después `false`); cursor `{ createdAt, id }`; índices compuestos para las 4 combinaciones de igualdad con y sin rango de precio (8 índices de presets); los 8 presets nacen de activar o no el rango de precio |
| D18 | Banderas | `destacada` manual (franja de portada) y `nuevo` automática: se enciende al crear y una tarea diaria la apaga a los 30 días (`NEW_FLAG_DAYS`) |
| D19 | Listados | Scroll infinito por cursor, de 12 en 12; sin paginación numerada |
| D20 | Proyectos sobre planos | Operación propia (`PROYECTO_SOBRE_PLANOS`) con campos propios (`etapa`, `fechaEntregaEstimada`, `unidadesDisponibles`) |
| D21 | Panorámicas 360° | Máximo 3 por inmueble |
| D22 | Idiomas | `es` por defecto y `en` con rutas localizadas; los admins escriben en español y el backend traduce al guardar los campos con traducción automática activa |
| D23 | Secretos | Secret Manager; sin secretos versionados ni en texto plano en `apphosting.yaml` |
| D24 | Ubicación | El catálogo discrimina hasta municipio, con departamento y municipio elegidos juntos como un solo filtro; sin campo, catálogo ni filtro de sector (si se menciona un sector, va como texto libre en `descripcion`) |
| D25 | Página Nosotros | `/nosotros` con la descripción amplia de la empresa y su equipo, editable desde el admin; la portada solo muestra el extracto |
| D26 | Contratos OpenAPI | **Dos** especificaciones: `./openapi.backend.yaml` (contrato interno BFF ↔ Functions con `X-Internal-Key`, `X-User-*` y `POST /internal/auth/verify`) y `./openapi.bff.yaml` (contrato público navegador ↔ BFF con cookie); la interna no se expone al navegador |
| D27 | Validación de identidad y autorización | El **backend** valida el idToken en login/refresh y comprueba `authorized_users`, y autoriza las rutas de administrador; el **BFF** emite y valida su JWT de sesión y propaga la identidad, sin Firebase Admin |
| D28 | Filtros y presets | Base fija: `status = ACTIVE`, operación de la pestaña y `destacada` con un solo valor; opcionales: precio (2), tipo (3) y ubicación (4); los 8 presets son `1`, `1+2`, `1+3`, `1+4`, `1+2+3`, `1+2+4`, `1+3+4` y `1+2+3+4`; la portada pide `destacada=true` y las pestañas piden `true` y después `false` |
| D29 | Revocación de sesión | No se exige invalidación inmediata al deshabilitar un admin; se acepta la ventana de hasta 65 min del JWT del BFF |
| D30 | Plano interno del backend | Las operaciones entre planos (verificación de sesión) viven bajo `/internal/*`, sin versionar y nunca alcanzables desde el navegador; `/api/v1/*` queda reservado a los recursos de dominio, que siempre reciben la identidad propagada. Es una garantía, no una convención: ninguna ruta pública la alcanza |
| D31 | Superficie pública del BFF | Rutas explícitas bajo `/api/*` (sin `/bff/` y sin catch-all): el router de Next.js es la allowlist (*fail-closed*). El mapeo a la ruta interna y la política de sesión se **derivan** de `./openapi.bff.yaml` hacia un único módulo generado, `packages/client/src/server/routes.ts`; las excepciones a la convención `/api/<x>` → `/api/v1/<x>` se declaran en la operación con `x-bff-internal-path` |
| D32 | Autoridad de autenticación del BFF | La cookie se valida en el **route handler** mediante un envoltorio guiado por `routes.ts` (D31), no en el Proxy: `public` no lee cookie, `session` exige cookie válida y entrega la identidad, `internal` exige `X-Internal-Key`. El Proxy solo cierra la superficie (404/405) y no autentica. La identidad se construye desde el JWT verificado y las cabeceras `X-User-*` del cliente se descartan y reescriben; el `X-Internal-Key` es el mismo secreto en ambos sentidos |
| D33 | Nombre de la cookie de sesión | La cookie del BFF es **`__session`** (convención de Firebase, que además es el único nombre que Firebase Hosting reenvía a Functions); `HttpOnly; Secure; SameSite=Strict; Path=/`, sin `Domain`. El identificador del esquema OpenAPI sigue siendo `session` |
| D34 | Vigencia del JWT de sesión | Vigente = firma HS256 (alg fijado, comparación en tiempo constante) + `iss`/`aud` + claims obligatorios + `iat`/`exp` con ±60 s de tolerancia + TTL exacto de 3900 s; sin `nbf`, sin ventana absoluta y sin denylist (D29). Cualquier fallo → 401 uniforme. Rotación del secreto con solape ≥ 65 min |
| D35 | Ubicación de `buildWhatsAppUrl` | El helper de WhatsApp vive en `packages/client/src/lib/whatsapp.ts` (runtime, función pura), no en `shared-types`, que no tiene código ejecutable (solo tipos y datos JSON de lectura). `functions` no lo necesita |
| D36 | Implementación de i18n | `next-intl` 4.14.9 en `@jf/client`, sin middleware (el Proxy sigue reservado a `/api` por D32): rutas localizadas en `src/i18n/routes.ts`, diccionarios `messages/{es,en}.json` con paridad de claves, `/` resuelto en `app/route.ts` por `Accept-Language` (307) y `dynamicParams = false` (404 para idiomas no soportados). Carga por `import()` de un solo idioma tras `server-only`, así el navegador solo recibe el diccionario activo (AC7.2.4). `setRequestLocale` en cada layout y página (render paralelo en Next 16). Zona horaria `America/Bogota` |

**Regla de repositorio (no es una decisión D):** el monorepo usa **npm únicamente** como gestor de paquetes (npm workspaces sobre `packages/shared-types`, `packages/functions` y `packages/client`); no se reintroduce pnpm.

---

## 6. Fuera de alcance en la v1

Criterios negativos que, si se incumplen, rechazan una historia (además de la lista «FUERA DE ALCANCE (v1)» de TASKS):

- **Sin Leads:** no existe la entidad Lead; no se guarda, lista ni gestiona ningún dato de solicitante (D11, US3.1, US3.2).
- **Sin `/_next/image`:** no hay peticiones al optimizador de Next.js; `next/image` solo con loader propio desde R2 (AC7.3.10).
- **Sin paginación numerada ni por offset:** solo scroll infinito por cursor (AC2.3.8, AC2.2.13).
- **Sin control de orden ni filtro de sector:** el orden es fijo (destacados primero, más recientes después) y la ubicación llega hasta municipio (AC2.2.13, D24).
- **Sin roles múltiples en la v1:** el rol siempre es `admin`; US1.12 es COULD (AC1.2.7, AC1.5.6).
- **Sin blocking functions ni Identity Platform:** la autorización vive en `authorized_users` verificada por el backend (US1.1.8).
- **Sin** blog, editor WYSIWYG, boletín, páginas `/requisitos` y `/pot`, mapa interactivo, estado vendido/alquilado, inicio de sesión con correo y contraseña, notificación automática a WhatsApp, pasarela de pagos, subida de videos como archivo, formulario de cotización de servicios, exportación de datos, bandeja o gestión de leads, campo o catálogo de sector, glosario del traductor y panel en inglés (FUERA DE ALCANCE de TASKS).
- **Sin** CAPTCHA, sin scripts de terceros en la carga inicial (salvo los embeds diferidos de YouTube y Pannellum bajo demanda) y sin teléfonos, correos ni secretos literales en el código (T2, US7.2.9).

---

## 7. Restricciones técnicas y operativas

| Área | Restricción |
| :---- | :---- |
| Runtime del backend | **Node.js 24** como versión oficial declarada en `engines` de `packages/functions` |
| Frontend | Next.js (App Router) desplegado en **Firebase App Hosting**, en el mismo proyecto de Firebase (D16) |
| Backend | **Firebase Functions** con Clean Architecture (capas dominio, aplicación, infraestructura y presentación) y contratos en las **dos specs OpenAPI** (D26) |
| Datos | **Cloud Firestore** para el catálogo, servicios, Nosotros, `authorized_users` e índices de `firestore.indexes.json`; `firestore.rules` en deny-all, con acceso solo vía Admin SDK desde Functions |
| Imágenes y 360° | **Cloudflare R2** (prefijo `pending/` con ciclo de vida de 1 día) y derivados WebP generados por el backend |
| Correo | **Resend**, con dominio verificado (SPF y DKIM) |
| Traducción | **Google Cloud Translation** detrás del puerto `Translator`, con traductor falso por variable de entorno en local, pruebas y seed (US0.5) |
| Secretos | **Secret Manager**; nunca en texto plano en el repositorio ni en `apphosting.yaml` (D23, T2) |
| Gestión de paquetes | **npm únicamente** (npm workspaces), sin pnpm |
| Renderizado | ISR con revalidación bajo demanda en ambos idiomas (US0.3); las visitas normales a páginas revalidadas no ejecutan Functions (AC7.4.5) |
| Accesibilidad y móvil | Mobile First como caso base (320 a 414 px), verificación a 375 px antes que escritorio (Épica 7) |
| Idioma y moneda | Contenido público en `es-CO` y `en`; panel solo en español; precios en COP enteros sin conversión (US0.4) |

> **Lectura pública de «Nosotros»:** el contrato define `GET /api/v1/about` (interno) y `GET /api/about` (BFF, sin sesión, AC0.2.7), que sirven el documento único `pages/nosotros` al bloque «Nosotros» de la portada (solo el `extracto`, AC2.6.4) y a la página `/nosotros` (AC5.6.1). El BFF la consume en el servidor al construir o revalidar la página (AC7.4.5), así que la visita normal no ejecuta Functions.

---

## 8. Criterios de éxito

1. **Aceptación de historias:** cada historia se cierra según `docs/DEFINITION-OF-DONE.md`, con sus AC de TASKS verificados por agente (`[agente]`) o por una persona (`[manual]`). Un `[Debe NOT]` incumplido rechaza la historia.
2. **Presupuestos medibles:** rendimiento y de datos según `docs/PERFORMANCE.md` (perfil móvil regular 4G con CPU equivalente 4× más lenta), con gates de Lighthouse y de bundles que fallan la build en CI (US7.2, US7.6).
3. **Trazabilidad:** todo requisito de este PRD remite a una US, un AC o una decisión D de `docs/TASKS.md`; TASKS es la fuente de verdad del alcance y de los criterios de aceptación, y este documento no añade requisitos propios.
4. **Control de costos:** alerta de presupuesto activa antes de producción, índices compuestos solo para las combinaciones documentadas, cero `AggregationQuery` y cero secretos versionados (US6.2).
5. **Contenido real:** textos legales con revisión jurídica antes del lanzamiento (AC5.3.4) y producción únicamente con el visto explícito del cliente (AC6.3.7).
