# docs/DATABASE.md
# Esquema de datos de Cloud Firestore

> **Fuente de verdad:** `docs/TASKS.md`, sección «MODELO DE DATOS MÍNIMO», más las decisiones D6, D7, D8, D9, D10, D11, D13, D14, D17, D18, D20, D21, D22, D24 y D25 y sus AC asociados. `packages/shared-types` es la implementación de ese modelo (ARCHITECTURE §7). Todo campo y todo valor de este documento es rastreable hasta TASKS; no hay campos inventados. El borrador anterior se descartó por completo: estaba en inglés, usaba enums y nombres de campo que contradicen este modelo, no contemplaba i18n y añadía campos y entidades que TASKS no define.

---

## Convenciones generales
 
- **Colecciones de dominio:** `properties`, `authorized_users` y `services`. **Documento único:** `pages/nosotros`. **Colección técnica (no Lead):** `consignment_email_notifications` (metadatos de notificaciones de Resend con tag `admin`, TTL 24 h, sin PII). No hay ninguna otra entidad de negocio en Firestore.
- **`id` no es un campo almacenado:** el identificador de un documento es su id en Firestore. Ese id se usa además como desempate de `createdAt` en el orden del listado y como segunda componente del cursor `{ createdAt, id }` (D17, AC1.10.1, AC1.10.2). Por eso en los índices compuestos aparece como `__name__` y no como `id`.
- **`Translatable`:** `{ es: string, en?: string, autoTranslate?: boolean, enPendiente?: boolean }`. `es` lo escribe el admin; `en` lo escribe el sistema con la traducción automática o el admin a mano; `autoTranslate` (activo por defecto, por campo) lo envía el admin en el DTO y decide si el backend traduce al guardar; `enPendiente` solo lo mantiene el backend (US0.5).
- **Campos obligatorios para pasar a `ACTIVE`:** `operacion`, `tipo`, `titulo` (`es`), `departamento`, `municipio`, `precio` y al menos una foto. Si falta alguno, 422 `VALIDATION_ERROR` listando los campos (AC1.7.3). El resto de los campos es opcional: en la ficha solo se muestra la fila del campo que existe (AC2.4.2).
- **Campos de solo lectura** en la API y en el editor: `codigo`, `createdAt`, `fechaPublicacion` y `updatedAt` (AC1.7.2). `updatedAt` además sostiene la concurrencia optimista: guardar con un valor desactualizado responde 409 `CONFLICT` y la UI conserva lo escrito (AC1.7.8, AC4.5.5).
- **Marcas de tiempo:** TASKS no fija el tipo de `createdAt`, `fechaPublicacion` ni `updatedAt` (Timestamp de Firestore u otra representación); esa elección se toma en `shared-types`.
- **Valores de catálogo sin traducir:** `tipo`, `operacion`, `amenidades` y las categorías de puntos de interés se guardan tal cual y se traducen en pantalla con los diccionarios (AC0.4.6).
- **Otras escrituras en Firestore que TASKS no modela:** la configuración de contacto de US5.5 (historia COULD). Al no definir TASKS su forma, no se documenta aquí.
- **Colección `rate_limits` (infraestructura):** contadores de límite de tasa con expiración TTL (AC3.4.2, US3.4).

---

## Colección `rate_limits` (infraestructura)

Contadores globales de límite de tasa para proteger endpoints públicos (consignaciones, formularios) contra abuso. Un documento por clave de rate-limit (IP, identidad, clave fija). Los contadores son atómicos entre instancias mediante transacción de Firestore y expiran automáticamente por TTL.

### Identificador del documento

`id` = SHA-256 hex de la clave de rate-limit (p. ej., IP del cliente, `user:<uid>`, `media-presign:<key>`). La clave en claro **nunca** se persiste ni se loguea.

### Campos

| Campo | Tipo | Descripción |
| :---- | :---- | :---------- |
| `keyHash` | `string` | SHA-256 hex de la clave (id del documento). |
| `count` | `number` (entero ≥ 0) | Contador de solicitudes en la ventana actual. |
| `windowStart` | `number` (epoch ms) | Inicio de la ventana deslizante fija. |
| `expiresAt` | `Timestamp` | Momento de expiración TTL; Firestore borra el documento automáticamente. |

### Política TTL

- Configurada en Firestore sobre el campo `expiresAt`.
- Valor por defecto: **300 segundos** (5 minutos).
- El valor es configurable fuera de código (variable de entorno / configuración de despliegue), no hardcodeado en la lógica de negocio.

### Coste de operaciones

| Resultado del check | Lecturas | Escrituras |
| :------------------ | :------: | :--------: |
| Permitido (dentro del límite) | 1 | 1 |
| Rechazado (429 `RATE_LIMITED`) | 1 | 0 |

La transacción lee el documento y, si el contador no excede el límite, lo escribe con el nuevo `count` y `expiresAt` renovado. Si excede, lanza `RateLimitedError` antes de escribir.

### Privacidad (sin PII)

- La clave original (IP, UID, etc.) **nunca** se guarda en claro. Solo su hash SHA-256.
- `keyHash` no es reversible criptográficamente; sirve solo para deduplicar contadores.
- No hay campos de identificación personal, email, ni metadatos de usuario en la colección.

### Sharding
 
- **Por defecto: sin sharding.** Un documento por clave.
- Reversible: si en el futuro se requiere mayor throughput, se puede añadir un sufijo de shard a la clave (p. ej., `keyHash + ":shard:N"`) sin migración de datos existente.
 
### Extracción de la clave de cliente (IP)
 
El guard de rate-limit público usa el siguiente fallback porque **`appBuilder.ts` no configura `trust proxy`** (Express `app.set('trust proxy', true)`). Detrás de un balanceador de carga (Cloud Run, Cloudflare, ALB, etc.), `req.ip` devuelve la IP del proxy, no la del cliente real.
 
```ts
const clientKey = req.header('x-client-ip') ?? req.ip ?? 'unknown';
```
 
- `x-client-ip`: cabecera inyectada por el balanceador / CDN (configuración de infraestructura).
- `req.ip`: fallback si la cabecera no llega; puede ser la IP del proxy si `trust proxy` no está activo.
- `'unknown'`: último recurso para que el rate-limit no falle silenciosamente; agrupa todo tráfico sin IP identificable bajo una misma clave.
 
> **Nota operativa:** para que `req.ip` sea la IP real del cliente detrás de balanceador, habilitar `app.set('trust proxy', true)` en `appBuilder.ts` y configurar el balanceador para enviar `X-Forwarded-For` / `X-Client-IP`. Mientras no se haga, el fallback anterior es la defensa razonable.
 
---
 
## 8. Colección `consignment_email_notifications` (técnica, no Lead)
 
Colección técnica para persistir notificaciones de entrega de correo de Resend **exclusivamente** cuando el payload del webhook incluye el tag `consignmentKind: 'admin'` (correo a Juan Fernando). Las notificaciones con tag `client` (acuse al visitante) o sin tag se descartan y no se persisten.
 
**No es una entidad Lead** (D11). No contiene datos del solicitante (nombre, teléfono, email, mensaje, asunto, dirección de destinatario). Solo guarda metadatos mínimos del evento de Resend para correlación y consulta interna.
 
### Identificador del documento
 
`id` = `svix-id` del evento (header `svix-id` de Svix). Garantiza idempotencia: un replay del mismo evento no crea duplicado.
 
### Campos
 
| Campo | Tipo | Descripción |
| :---- | :---- | :---------- |
| `eventId` | `string` | Identificador único del evento en Resend (mismo valor que `svix-id`). |
| `eventType` | `string` | Tipo de evento de Resend (p. ej. `email.delivered`, `email.bounced`, `email.opened`, `email.clicked`). |
| `requestId` | `string` | Identificador de la solicitud de consignación (`consignmentRequestId` del tag). Correlaciona envío y notificaciones. |
| `consignmentKind` | `string` | Valor fijo `'admin'` (solo se persisten notificaciones con este tag). |
| `createdAt` | `Timestamp` | Momento de creación del evento en Resend (timestamp del proveedor). |
| `receivedAt` | `Timestamp` | Momento de recepción y persistencia en el backend. |
| `expiresAt` | `Timestamp` | Momento de expiración TTL: `createdAt + CONSIGNMENT_NOTIFICATION_TTL_SECONDS` (default 86400 s = 24 h). No se renueva. |
 
### Política TTL
 
- Configurada en Firestore sobre el campo `expiresAt`.
- Valor por defecto: **86400 segundos** (24 horas), configurable vía variable de entorno `CONSIGNMENT_NOTIFICATION_TTL_SECONDS`.
- La expiración se cuenta desde `createdAt` de cada notificación y **no se renueva** al consultar.
- Firestore borra el documento automáticamente al alcanzar `expiresAt`.
 
### Consultas
 
- **Por `requestId`**: consulta simple (sin índices compuestos) filtrando `requestId == <valor>` y `expiresAt > now`. El ordenamiento por `receivedAt` ascendente se hace en memoria (la colección es pequeña: máx. unos pocos eventos por solicitud).
- **Por `svix-id` (id del documento)**: `create()` para idempotencia en `appendIfAbsent`; si ya existe, no-op.
 
### Privacidad (sin PII)
 
- **No se persiste**: nombre, teléfono, email, mensaje, asunto, dirección de destinatario, `email_id`, `message_id`, payload crudo del webhook.
- Solo metadatos del evento (`eventId`, `eventType`, `createdAt`, `receivedAt`) y la correlación (`requestId`, `consignmentKind: 'admin'`).
- Los logs del backend registran a nivel `debug` (sin PII) los eventos descartados por tag `client` o sin tag.
 
### Coste de operaciones
 
| Operación | Lecturas | Escrituras |
| :-------- | :------: | :--------: |
| `appendIfAbsent` (nuevo) | 0 | 1 |
| `appendIfAbsent` (replay, ya existe) | 1 | 0 |
| `listByRequestId` | N (documentos vigentes) | 0 |
 
---
 
## 9. Colección `properties`

Un documento por inmueble. El listado público exige siempre `status = ACTIVE` más la `operacion` de la pestaña (D9); el admin ve `HIDDEN` solo por su API y nunca `DELETED` (AC1.7.6, AC1.7.7). Los tres estados se crean y se retiran sin estado de disponibilidad (vendido o alquilado) y sin `DRAFT`: un inmueble nuevo nace en `HIDDEN` y se valida al activar (D7, supuesto 2, AC1.7.9).

### Campos

| Campo | Tipo | Descripción |
| :---- | :---- | :---------- |
| `id` | id del documento | **No es un campo almacenado.** Es el id del documento en Firestore; sirve de desempate de `createdAt` y de segunda componente del cursor `{ createdAt, id }` (AC1.10.2). En los índices compuestos se refleja como `__name__`. |
| `codigo` | `string` | `JF-XXXX` secuencial, asignado al crear con un contador atómico en Firestore (D6, AC1.7.1). Solo lectura. |
| `slug` | `string` | Se genera del título en español + `codigo` y es el mismo en ambos idiomas (AC0.4.7). |
| `status` | enum | `ACTIVE`, `HIDDEN` o `DELETED` (D7). Ver enumeraciones. |
| `operacion` | enum | `VENTA`, `ALQUILER` o `PROYECTO_SOBRE_PLANOS`; una sola por inmueble, sin operación secundaria ni `precioArriendo` (D8, D20, supuesto 3). |
| `tipo` | enum | `CASA`, `APARTAMENTO`, `LOTE_CAMPESTRE`, `LOTE_URBANO`, `FINCA`, `LOCAL_COMERCIAL`, `BODEGA` u `OFICINA`. |
| `titulo` | `Translatable` | Obligatorio en `es` para activar. |
| `descripcion` | `Translatable` | Texto libre. Aquí va, como texto libre, cualquier mención de sector o barrio (D24). |
| `precio` | entero (COP) | Valor de venta o canon mensual (supuesto 3). Debe ser entero y mayor que 0 (AC1.7.4). Es el campo del rango de filtros (D9). |
| `departamento` | `string` | Con `municipio` forma el único filtro de ubicación, elegido siempre juntos (D24). |
| `municipio` | `string` | El catálogo solo discrimina hasta municipio; se guarda junto con `departamento` para desambiguar municipios homónimos de distintos departamentos (D24). |
| `estrato` | `number` | Opcional. Se muestra en la ficha si existe (AC2.4.2) y sirve de filtro en caliente en el navegador. |
| `predial` | `number` | Opcional. Se muestra en la ficha si existe (AC2.4.2). |
| `administracion` | `number` | Opcional. Se muestra en la ficha si existe (AC2.4.2). |
| `acabados` | `Translatable` | Campo traducible (US0.5). |
| `antiguedad` | `number` | Opcional. Se muestra en la ficha si existe (AC2.4.2). |
| `areaConstruida` | `number` | Opcional. Se muestra en la ficha si existe y filtra en caliente en el navegador. |
| `areaLote` | `number` | Opcional. Ídem. |
| `dormitorios` | `number` | Opcional. Aparece en la tarjeta (AC2.2.11) y filtra en caliente. |
| `banos` | `number` | Opcional. Ídem. |
| `parqueaderos` | `number` | Opcional. Ídem. |
| `deposito` | `number` | Opcional. El cuarto útil; se muestra si existe (AC2.4.2). |
| `amenidades[]` | array | Catálogo cerrado en `shared-types`, p. ej. `PISCINA`, `CANCHA`, `GIMNASIO`. Se guarda sin traducir (AC0.4.6) y filtra en caliente. |
| `puntosInteres[]` | array | Cada ítem es una categoría predefinida o un ítem personalizado con la etiqueta en formato `Translatable` (traducible, US0.5). No aparece en los listados (AC7.4.1). El sector o barrio no vive aquí: va en `descripcion` (D24). |
| `fotos[]` | array | El orden es la posición y la posición 1 es la portada; cada foto lleva las claves de sus derivados. El editor la reordena y permite elegir portada (AC4.2.3). Al menos una es obligatoria para activar (AC1.7.3). |
| `videos[]` | array de `string` | Máximo 2 URLs de YouTube (D13). |
| `panoramas[]` | array de `string` | Archivos `.jpg` en R2, máximo 3 por inmueble (D14, D21); se cargan con Pannellum solo al abrir el visor. |
| `destacada` | `boolean` | Bandera manual (D18). La portada pide `true` y las pestañas piden primero `true` y después `false`; nunca ambos a la vez en una consulta (D28). |
| `proyecto?` | objeto | Solo si `operacion = PROYECTO_SOBRE_PLANOS`. Ver §1.1. |
| `fechaPublicacion` | marca de tiempo | Solo lectura. Se fija en la primera activación; ocultar y reactivar no la cambia (AC1.7.5). Ordena las destacadas de portada (AC1.10.6). |
| `createdAt` | marca de tiempo | Registrada al crear (AC1.7.1). Orden del listado (descendente) y componente del cursor (D17). |
| `updatedAt` | marca de tiempo | Solo lectura. Concurrencia optimista (AC1.7.8). |

### Enumeraciones

| `status` (D7) | `operacion` (D8, D20) | `tipo` |
| :---- | :---- | :---- |
| `ACTIVE` | `VENTA` | `CASA` |
| `HIDDEN` | `ALQUILER` | `APARTAMENTO` |
| `DELETED` | `PROYECTO_SOBRE_PLANOS` | `LOTE_CAMPESTRE` |
|  |  | `LOTE_URBANO` |
|  |  | `FINCA` |
|  |  | `LOCAL_COMERCIAL` |
|  |  | `BODEGA` |
|  |  | `OFICINA` |

- `codigo` siempre sigue el patrón `JF-XXXX` (D6).
- `fechaEntregaEstimada` usa el patrón `AAAA-MM`.

### 1.1 Bloque `proyecto`

Solo se guarda cuando `operacion = PROYECTO_SOBRE_PLANOS`; con cualquier otra operación el bloque no se muestra y no se guarda (AC4.1.5, D20, supuesto 7).

| Campo | Tipo | Descripción |
| :---- | :---- | :---------- |
| `proyecto.etapa` | `Translatable` | Campo traducible (US0.5). |
| `proyecto.fechaEntregaEstimada` | `string` | Mes y año de entrega estimada en formato `AAAA-MM`. |
| `proyecto.unidadesDisponibles` | `number` | Unidades disponibles del proyecto. |

---
 
## 10. Colección `authorized_users`

Lista blanca de administradores que el **backend** verifica al crear la sesión, a petición del BFF (D27, US1.1). Firebase Auth solo aporta la identidad con Google; el rol no se guarda como custom claim sino que se lee de aquí (AC1.1.4).

| Campo | Tipo | Descripción |
| :---- | :---- | :---------- |
| `email` | `string` | Correo del administrador. No estar aquí, o tener `active = false`, produce 403 `PERMISSION_DENIED` sin cookie (AC1.1.1, AC1.1.3). |
| `role` | `string` | En la v1 su valor es siempre `admin`; no se distinguen otros roles (AC1.2.7, AC1.5.6). |
| `active` | `boolean` | Quitar a un admin es `active = false`; el corte surte efecto al expirar la cookie vigente, hasta 65 min (US1.1, D29). |
| `createdAt` | marca de tiempo | Fecha de alta en la lista blanca (supuesto 1). |

- El conjunto es pequeño (≤ 5 administradores) y se gestiona como operación de servidor (AUTHENTICATION.md).
- El BFF no lee ni escribe esta colección; vive solo en el backend (AC1.2.9). Nunca está en variables de entorno ni en Firebase Auth (AC1.1.8).

---
 
## 11. Colección `services`

Servicios editables desde el panel sin cantidad fija: crear, editar, ocultar, reordenar y eliminar (D10). Comparten los mismos estados que los inmuebles (US4.4).

| Campo | Tipo | Descripción |
| :---- | :---- | :---------- |
| `id` | id del documento | Identificador del servicio en la colección `services`. |
| `slug` | `string` | Ruta del detalle, `/servicios/[slug]` (US0.4). |
| `status` | enum | `ACTIVE`, `HIDDEN` o `DELETED`, igual que en `properties` (D7, US4.4). |
| `titulo` | `Translatable` | Traducible (US0.5). |
| `resumen` | `Translatable` | Traducible (US0.5). |
| `cuerpo` | `Translatable` | Traducible (US0.5). Texto plano con párrafos, sin HTML (US4.4). |
| `fotos[]` | array | Galería de obras; reutiliza el flujo de fotos de los inmuebles, con portada, orden y derivados (AC4.4.6). |
| `orden` | `number` | Persiste al reordenar y define el orden público del índice (AC4.4.3, AC5.1.1). |
| `updatedAt` | marca de tiempo | Última modificación. |

---
 
## 12. Documento único `pages/nosotros`

Contenido de la página `/nosotros` (y `/en/about-us`), editable desde el panel (D25, US4.5, US5.6). La portada solo muestra el `extracto` (AC2.6.4).

| Campo | Tipo | Descripción |
| :---- | :---- | :---------- |
| `titulo` | `Translatable` | Campo obligatorio de la página: si su `en` está vacío, la versión en inglés lleva `noindex` y no entra en el sitemap (AC0.4.5). |
| `extracto` | `Translatable` | Máximo 500 caracteres; es lo que se muestra en la portada. |
| `secciones[]` | array | Cada elemento tiene `id`, `titulo` (`Translatable`), `cuerpo` (`Translatable`); el orden es la posición. Son secciones libres, sin lista fija (US5.6). |
| `equipo[]` | array | Cada elemento tiene `id`, `nombre`, `cargo` (`Translatable`), `descripcion?` (`Translatable`), `foto?`; el orden es la posición. `nombre` no se traduce (US0.5). |
| `updatedAt` | marca de tiempo | Último guardado; la concurrencia optimista responde 409 si está desactualizado (AC4.5.5). |

---
 
## 13. Sin entidad Lead (D11)

**No existe la entidad Lead.** Las solicitudes (consignación y contacto) solo generan correos (US3.2, D5); no se guarda, lista ni gestiona ningún dato de solicitante en Firestore ni en ningún otro sitio (D11; `docs/TASKS.md`, §«MODELO DE DATOS MÍNIMO»). El «guardado o gestión de leads» está además en la lista de fuera de alcance de v1.

---
 
## 14. Índices compuestos

Los índices viven en `firestore.indexes.json` (raíz del repo) y deben coincidir con la tabla única de combinaciones de `docs/ARCHITECTURE.md` §5 (D17, AC1.10.4). Si cambia un preset, hay que actualizar a la vez esa tabla, `firestore.indexes.json` y `shared-types`.

| # | Preset (D28) | Igualdades opcionales | Rango de precio | Índice compuesto |
| :-- | :-- | :-- | :-- | :-- |
| 1 | `1` | (ninguna) | no | `status ASC, operacion ASC, destacada ASC, createdAt DESC, __name__ DESC` |
| 2 | `1+2` | (ninguna) | sí | `status ASC, operacion ASC, destacada ASC, precio ASC, createdAt DESC, __name__ DESC` |
| 3 | `1+3` | `tipo` | no | `status ASC, operacion ASC, destacada ASC, tipo ASC, createdAt DESC, __name__ DESC` |
| 4 | `1+4` | `departamento` + `municipio` | no | `status ASC, operacion ASC, destacada ASC, departamento ASC, municipio ASC, createdAt DESC, __name__ DESC` |
| 5 | `1+2+3` | `tipo` | sí | `status ASC, operacion ASC, destacada ASC, tipo ASC, precio ASC, createdAt DESC, __name__ DESC` |
| 6 | `1+2+4` | `departamento` + `municipio` | sí | `status ASC, operacion ASC, destacada ASC, departamento ASC, municipio ASC, precio ASC, createdAt DESC, __name__ DESC` |
| 7 | `1+3+4` | `tipo` + `departamento` + `municipio` | no | `status ASC, operacion ASC, destacada ASC, tipo ASC, departamento ASC, municipio ASC, createdAt DESC, __name__ DESC` |
| 8 | `1+2+3+4` | `tipo` + `departamento` + `municipio` | sí | `status ASC, operacion ASC, destacada ASC, tipo ASC, departamento ASC, municipio ASC, precio ASC, createdAt DESC, __name__ DESC` |
| 9 | Portada (AC1.10.6) | (ninguna) | no | `status ASC, destacada ASC, fechaPublicacion DESC, __name__ ASC` |

Notas:

- **Desempate por `__name__`:** cada índice termina en `__name__` porque el campo `id` no está almacenado en el documento; `__name__` es el id del documento y es el mismo valor que viaja como `id` en el cursor `{ createdAt, id }`. La paginación usa `startAfter` con ese cursor y no produce duplicados ni huecos, incluso con `createdAt` iguales (AC1.10.2).
- **Igualdades base fijas** de los presets 1 a 8: `status = ACTIVE`, la `operacion` de la pestaña y `destacada` con un único valor (`true` o `false`, nunca ambos). Opcionales: `tipo`; `departamento` + `municipio` siempre juntos (D24); y el rango `precioMin`/`precioMax` sobre `precio` (D9, D28).
- **Un preset es un índice:** el rango de precio no comparte índice con el mismo preset sin precio, y el preset sin precio necesita su propia fila sin la columna `precio` (AC1.10.4).
- **Combinación fuera de la tabla:** 422 `VALIDATION_ERROR` en el backend (AC1.10.5) y bloqueo previo en el cliente; nunca `FAILED_PRECONDITION` ni 500.
- **Consulta de la insignia «Nuevo» (US1.11):** se evalúa en el frontend con `isNewProperty(createdAt)`; no hay campo `nuevo` ni consulta en backend.
- **Pendiente de validación en el emulador:** Firestore exige que el primer `orderBy` sea sobre el mismo campo del filtro de rango (`>=`/`<=`), por lo que la consulta con `precio` y `orderBy(createdAt desc)` de AC1.10.2 puede rechazarse o exigir otro orden (choque con AC1.10.7). Los 8 presets y sus 8 índices se mantienen tal como están; el orden exacto se confirma en el emulador antes de cerrar US1.10. No rediseñar presets.

---
 
## 15. Ítem abierto: `RIGHTS_TRANSFER`

**Pendiente de confirmación: fuera del alcance actual según TASKS.** El borrador anterior listaba `RIGHTS_TRANSFER` (cesión de derechos) como valor del tipo de inmueble, pero TASKS no lo incluye en el enum `tipo` ni en ningún otro enum, y no define dónde encajaría. Se deja registrado como única decisión abierta del modelo de datos, sin añadirlo como valor activo en ninguna parte. Confirmar con el propietario antes de incorporarlo.
