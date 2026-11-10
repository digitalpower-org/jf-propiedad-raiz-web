# Cuestionario para redactar packages/functions/AGENTS.md

**Estado:** borrador  
**Origen:** preguntas que no se pueden deducir de `docs/BACKEND-ARCHITECTURE.md` ni de los `.opencoderules` actuales.

## Cómo responder

- Lee cada bloque y marca las respuestas que quieras definir.
- Lo que dejes en blanco lo asumiré con la **propuesta** indicada, y lo dejaré anotado como "suposición" en el `AGENTS.md` resultante.
- Puedes responder en el chat y yo escribo el archivo; o editar directamente este documento.
- **Prioridad:** si solo tienes tiempo para un bloque, responde el Bloque A, B, C, G y H (los marcados como bloqueantes).

---

## Bloque A — Estado real vs. estructura objetivo (bloqueante)

El documento `docs/BACKEND-ARCHITECTURE.md` §3 se titula "estructura **objetivo**".

**A1.** ¿Esa estructura ya es obligatoria hoy, o `src/` está en migración?  
¿Qué carpetas son legacy que **no** deben copiarse?  
> Propuesta: `src/seed/`, `src/budget-config.ts`, `src/health.ts`, `application/translation` y `application/revalidation` son legacy tolerado hasta el backlog §12.

**A2.** ¿`seed/` y `budget-config` son **excepciones permanentes** a la regla de capas?  
El seed necesita Firestore: ¿puede importar `infrastructure` directamente o debe pasar por puertos?

**A3.** ¿El backlog §12 sigue vigente y en qué punto está?  
¿Hay algo ya implementado que el documento no refleje?

**A4.** `docs/DEVELOPMENT_GUIDE.md` §2 todavía dice "exportar la función en `index.ts`", lo que contradice B1/B2 (una sola función `api`, rutas en `presentation/routes.ts`).  
¿Lo marco como obsoleto para backend dentro de `AGENTS.md`, o prefieres corregirlo aparte?

---

## Bloque B — Convenciones de código (bloqueante)

**B5.** Idioma de identificadores. Veo dominio en español (`Precio`, `Operacion`, `propiedad`) y andamiaje en inglés (`UseCase`, `Repository`).  
¿Es regla deliberada ("dominio ES, técnico EN") o accidente histórico?

**B6.** Nombres de archivo: ¿kebab-case siempre? ¿Un export público por archivo?  
¿Sufijos (`*.use-case.ts`, `*.repository.ts`, `*.handler.ts`) o nombres planos?

**B7.** Adaptadores: ¿factory functions `createX` (como en el doc) o clases?  
Handlers: ¿`makeXHandler`? Entidades: ¿clase con constructor privado + factory estático?

**B8.** ¿Se mantienen los límites de `.opencoderules` (≤250 LOC/archivo, ≤30 LOC/función, sin parámetros booleanos de control)?  
¿Aplican también a tests?

---

## Bloque C — Errores y mensajes (bloqueante)

**C9.** Los `message` de `ApiError`: ¿se escriben en cada `throw` o se centralizan en un catálogo de mensajes?  
Si se centralizan, ¿dónde viven?

**C10.** ¿Regla de estilo para mensajes (imperativo, sin punto final, sin PII, español)?  
¿Se permite variar el literal por endpoint?

**C11.** `details`: ¿solo `{field, issue}` para validación, o hay otras estructuras permitidas?

---

## Bloque D — Validación con Zod (deseable)

**D12.** ¿Mensajes de Zod en español? ¿`errorMap` global o mensajes por schema?

**D13.** Schemas de frontera (Presentation) vs. VOs (Domain): ¿se duplican a propósito o se reutilizan?  
¿Quién normaliza (`trim`, minúsculas): VO, handler o ambos?

**D14.** ¿`z.coerce` permitido para query params? ¿Cómo se tipan fechas y números que llegan como string?

---

## Bloque E — Persistencia (deseable; `docs/DATABASE.md` cubre parte)

**E15.** Nombres de colecciones e IDs: ¿`properties`, `services`, `about`, `authorized_users`?  
¿ID = código secuencial, slug o UUID?

**E16.** ¿Quién pone `createdAt`/`updatedAt`: `Clock` inyectado o `FieldValue.serverTimestamp()`?  
(afecta testabilidad)

**E17.** Paginación: ¿cursor opaco? ¿forma `{ items, nextCursor }`?  
¿Límite por defecto y máximo?

**E18.** ¿Soft delete o borrado físico? ¿Concurrencia optimista (versión) o last-write-wins?

**E19.** ¿Los repositorios devuelven entidades ya parseadas?  
¿Validar el documento Firestore con Zod en el adaptador es obligatorio?

---

## Bloque F — Media, email, rate limit, traducción (deseable)

**F20.** R2: TTL de URLs prefirmadas, MIME permitidos, tamaños máx/mín, naming de keys, derivados (tamaños/formato) y limpieza de huérfanos.

**F21.** Resend: remitente, plantillas en código o en dashboard, reintentos, idempotencia,  
¿qué fallo exacto produce `EMAIL_DELIVERY_FAILED`?

**F22.** Rate limit: clave (IP/email/uid), ventana y cupo, almacenamiento (Firestore vs Cloud Armor),  
¿respuesta esperada?

**F23.** Traducción: campos traducibles, ¿falla abierta o cerrada si el proveedor cae?,  
¿la edición manual pisa la automática?, ¿se cachea?

---

## Bloque G — Testing (bloqueante solo la ubicación)

**G24.** ¿Dónde viven los fakes/stubs: junto al test, `src/**/__fakes__/` o `test/fakes/`?

**G25.** ¿Todo adaptador exige test con emulador, o basta un fake de contrato?  
¿El CI levanta emulador o solo corre unit/integración?

**G26.** ¿El 80 % de cobertura es por carpeta o global?  
¿Lo exijo ya aunque el gate 5 del CI "pasa en vacío" (`test:coverage` sin thresholds)?

---

## Bloque H — Flujo de trabajo y DoD (bloqueante)

**H27.** Checklist canónico al añadir endpoint:  
¿OpenAPI → codegen de `shared-types` (¿manual o script?) → `API_PATHS` → handler → use case → tests → docs?  
¿Hay algún paso que hoy se olvide sistemáticamente?

**H28.** ¿Qué comandos exactos debe correr el agente antes de decir "listo"?  
¿Por workspace o desde la raíz?

**H29.** ¿El agente actualiza `docs/TODOS.md` al cerrar una US, o eso lo haces tú?

**H30.** ¿Convención de commits y ramas (Conventional Commits, prefijos, idioma)?

---

## Bloque I — Límites del agente y alcance del archivo (bloqueante)

**I31.** ¿Qué **no** debe hacer un agente en `packages/functions`?  
Propuesta: no tocar `packages/client`, no cambiar contratos OpenAPI sin aprobación,  
no añadir dependencias sin preguntar, no desplegar, no editar `firestore.rules` ni `firestore.indexes.json`.

**I32.** ¿Puede añadir dependencias? ¿Con qué criterio (caso de uso documentado, sin alternativas)?

**I33.** ¿Debe pedir confirmación antes de refactors estructurales o migraciones de capas?

**I34.** **Idioma de `AGENTS.md`**: ¿español (coherente con `docs/`) o inglés (habitual para agentes)?

**I35.** **Relación con `.opencoderules`**: ¿lo reemplazamos por `AGENTS.md`, o conviven?  
¿Quieres también un `AGENTS.md` en la raíz (convenciones del monorepo, gates, precedencia)  
y un `CLAUDE.md` con `@AGENTS.md` en `packages/functions/`?

---

## Prioridad mínima

Con responder **A1, A2, B5, C9, G24, H27, H28, I31, I34, I35** (10 preguntas)  
ya puedo escribir un `packages/functions/AGENTS.md` útil y no genérico.  
El resto se completa después sin reescribirlo.

---

## Notas para el agente (mío)

- No duplicar `docs/BACKEND-ARCHITECTURE.md` en el `AGENTS.md`.
- `AGENTS.md` = índice operativo + no negociables + comandos + estado actual.
- Precedencia: `docs/BACKEND-ARCHITECTURE.md` (normativo) > `AGENTS.md` (operativo).
- Objetivo de tamaño: 80–120 líneas; si pasa de ~150, está duplicando documentación.
