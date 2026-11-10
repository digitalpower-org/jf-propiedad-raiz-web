Respuestas a AGENTS-QUESTIONNAIRE.md

A1: 
- Esa estructura propuesta en BACKEND-ARCHITECTURE.md §3 es una propuesta. 
- No nos tenemos que adherir totalmente a ella pero es una guía estructural que me parece muy buena.

A2: 
- Si son excepciones. seed/ puede importar infrastructure directamente.

A3:
- No está vigente, está completado. Todos los 9 ítems están hechos, 100% implementado. Solo queda limpiar la nota desactualizada del §11.3 sobre supertest.
- Lo que ya está implementado y  que no se refleja: budget-config.ts, seed/early-deployment.ts, seed/sample-data.ts, y los archivos de health check no aparecen en el documento. Actualmente el documento omite el módulo de presupuesto/costos (US6.2) y el despliegue temprano (MT1.5).

A4:
- Márcalo como obsoleto para backend dentro de AGENTS.md,

B5:
- Es accidente histórico, pero prefiero que por ahora no lo cambies y trabajemos con el andamiaje del  backend en inglés. Luego te digo si adaptamos el dominio a inglés.


B6:
- Si, kebab-case siempre
- No obligatoriamente un export público por archivo. Pero siempre buscando que los archivos no crezcan.
- Usa sufijos (*.use-case.ts, *.repository.ts, *.handler.ts)  

B7:
- Adaptadores: Si, factory functions createX, una función fábrica que devuelve un objeto que cumple la interfaz del puerto.
- Handlers: Si, makeXHandler
- Entidades: Si, clase con constructor privado + factory estático

B8:
Si se mantienen esos valores y sin booleanos de control.
En cuanto a los test: Cada it() debe probar un único comportamiento y ser breve (idealmente <30 LOC). Los archivos de test pueden superar las 250 LOC si agrupan casos relacionados, pero deben organizarse con describe. Prohibidos parámetros booleanos de control en helpers de test; usar funciones nombradas o tipos discriminados en su lugar. Legibilidad sobre brevedad: un test es documentación viva.

C9:
Mensajes de error: Los mensajes por defecto se centralizan en packages/functions/src/domain/errors/errorCatalog.ts. Cada throw new ApiError(code) usa el mensaje del catálogo salvo que se pase options.message para contextualizar. El catálogo se valida en tiempo de compilación contra el contrato OpenAPI mediante packages/functions/src/domain/errors/errorCatalog.contract.ts. Domain no conoce códigos HTTP; esos viven solo en Presentation (STATUS_BY_CODE).


C10:
Estilo de mensajes de error:
- Idioma: español.
- Sin punto final al final del mensaje.
- Sin PII, sin stack traces, sin rutas internas ni datos sensibles.
- Un mensaje por ErrorCode en errorCatalog.ts. No variar el literal por endpoint.
- Contextualización puntual permitida vía options.message o details en el throw, sin alterar el código de error.

C11:
Estructura de details:
- { field: string; issue: string }[] es la estructura estándar para VALIDATION_ERROR.
- Otros códigos de error pueden usar estructuras diferentes, pero deben definirse explícitamente y usarse de forma consistente.
- details nunca debe contener PII, stack traces, ni objetos no serializables.
- La clase ApiError tipa details como unknown; cada throw es responsable de pasar la forma correcta para su código de error.

D12:
- Mensajes de error de usuario en español.
- Usar un errorMap global único (presentation/validation/zodErrorMap.ts) que traduzca los códigos de Zod (required, invalid_type, too_small, etc.).
- Overrides por schema solo para mensajes de negocio específicos de un campo; no para mensajes genéricos.
- Los errores de Zod se capturan en Presentation y se convierten en ApiError('VALIDATION_ERROR', { details: [{ field, issue }] }) antes de llegar al middleware central.
- Domain y Application no conocen Zod ni ZodError.

D13:
- Los schemas de frontera (Presentation/Zod) y los Value Objects (Domain) se definen de forma independiente. Se duplican a propósito porque validan cosas distintas: forma de HTTP vs. invariantes de negocio.
- Presentation puede compartir el tipo TypeScript del VO mediante import type, pero no su schema Zod ni su lógica de validación.
- La normalización (trim, minúsculas, formato canónico) ocurre en el parse del VO. Presentation puede hacer limpieza superficial opcional, pero nunca reemplaza la normalización del VO.
- Domain nunca importa schemas de validación de Presentation.

D14:
- z.coerce en query params:
- Permitido exclusivamente en Presentation para convertir strings de query params a número, booleano, etc.
- Para fechas: preferir z.string().datetime().transform(s => new Date(s)) sobre z.coerce.date() para evitar fechas inválidas silenciosas.
- Siempre validar restricciones de rango tras la coerción (.min(), .max(), .positive(), etc.).
- Domain y Application no usan z.coerce ni conocen query params.

E15: 
- Colecciones en Firestore: plurales en inglés, snake_case si son varias palabras (properties, services, about, authorized_users).
- ID de documento: UUID v4. Nunca IDs secuenciales numéricos en Firestore.
- Identificador público en URLs: slug (para propiedades y servicios).
- Código de negocio legible: opcional, campo separado (código, tipo JF-0001), no es el ID del documento.


E16:
- Usar un puerto Clock inyectado (application/ports/clock.ts), implementado en Infrastructure (createSystemClock).
- Los casos de uso y entidades reciben el Clock por constructor y generan los timestamps ellos mismos.
- FieldValue.serverTimestamp() de Firebase no se usa en Domain ni Application. Solo podría aparecer encapsulado en Infrastructure como auditoría adicional de Firestore, nunca como fuente de tiempo para lógica de negocio.
- En tests se inyecta un Clock fijo para hacer los tests deterministas.

E17:
- Forma de respuesta: { items: T[], nextCursor: string \| null } (schema PropertyListData).
- Cursor opaco: cursor query param, tipo string. Contiene { createdAt, id } de la serie; solo aplica dentro de su propia serie.
- Límite por defecto: 12. Límite máximo: 50.
- Presentation valida limit y cursor con Zod: z.coerce.number().int().min(1).max(50).default(12) y z.string().optional().
- El puerto del repositorio recibe { limit, cursor? }; Infrastructure (Firestore) traduce el cursor a startAfter sobre createdAt + id.
- No incluir total. Si se necesita, endpoint separado.

E18:
- Soft delete: nunca borrar físicamente de Firestore. Cambiar status a DELETED y actualizar updatedAt. Las consultas públicas filtran por status = ACTIVE (o != DELETED según caso).
- Concurrencia optimista: usar updatedAt como versión implícita. El cliente envía updatedAt en PUT/DELETE; si difiere del almacenado, responder 409 CONFLICT. No usar last-write-wins.
- Esto aplica a inmuebles, servicios y el documento about (AC1.7.8, AC4.5.5).

E19:
- Los repositorios de Infrastructure devuelven entidades de Domain ya parseadas (Value Objects y Entidades), nunca DocumentSnapshot ni objetos crudos de Firestore.
- Es obligatorio validar cada documento de Firestore con Zod en el adaptador antes de devolverlo (§7.1 del documento de arquitectura).
- Si la validación falla, lanzar ApiError (generalmente INTERNAL o el código correspondiente) desde el adaptador; nunca dejar pasar datos no válidos a Application.
- Domain y Application no importan firebase-admin, zod para validación de BD, ni conocen la estructura de colección de Firestore.

E20: (R2 / Media):
- TTL URL presignada: 900 segundos (15 min).
- MIME permitidos: image/jpeg, image/png, image/webp. Cualquier otro → 422 UNSUPPORTED_MEDIA.
- Tamaños: peso máximo 5 MB (por definir en TASKS); lado mayor mínimo 800 px; lado mayor máximo 4096 px (por definir).
- Naming de keys: pending/<uuid>.<ext> para subidas temporales; propiedades/<codigo>/... y servicios/<slug>/... para definitivas. El cliente no elige la ruta.
- Derivados: formato WebP; tamaños 320/640/1280/2048 o completo. Estructura clavesPorAncho. El original se elimina tras generar derivados.
- Limpieza de huérfanos: no implementada en v1. Considerar a futuro job nocturno para pending/ > 24h. No borrar archivos de soft-deletes inmediatamente.


F21: (Resend / Email)
- Estado: no implementado. Pendiente de adaptador EmailSender en infrastructure/email/ y puerto en application/ports/email-sender.ts.
- Remitente: por definir en variables de entorno (RESEND_FROM_EMAIL, RESEND_API_KEY).
- Plantillas: recomendado en código (versionables), no en dashboard de Resend.
- Reintentos: 2 reintentos con backoff exponencial (3 intentos totales por envío). EMAIL_DELIVERY_FAILED se lanza solo tras agotar los 3 intentos.
- Idempotencia: no aplica. Si el cliente reenvía la misma solicitud de consignación, se vuelven a enviar ambos correos.
- Flujo secuencial y bloqueante: primero se envía el correo al administrador; solo si tiene éxito se envía el recibo al solicitante. El caso de uso no responde hasta completar ambos envíos o fallar.
- EMAIL_DELIVERY_FAILED: código de dominio ya definido. Mapea a HTTP 502. Se dispara cuando falla el envío al administrador o el recibo al solicitante tras agotar los reintentos. Si falla el correo al administrador, no se intenta enviar el recibo.


F22:
- Aplicar a todos los endpoints excepto /health (sin rate limit o muy permisivo).
- Diferenciación por tipo de endpoint:
Endpoint | Clave | Cupo
Públicos de lectura (GET /properties, /services, /about) | IP | Alto (ej. 60–100 req/min)
POST /api/v1/consignations | IP | 5 req/min (1 min)
Admin escritura (PUT/POST/DELETE /properties/*, /services/*, /about) | X-User-Id | (sesión BFF)	Moderado (ej. 30 req/min)
POST /internal/auth/verify | IP del BFF | Bajo
- No usar solo IP para admin porque el BFF puede compartir IP entre muchos usuarios.
- Puerto RateLimiter en application/ports/; adaptador en Infrastructure (Firestore para v1).
- Domain y Application no conocen el mecanismo de rate limiting.
- Respuesta esperada: 429 RATE_LIMITED con envelope estándar de error y code: "RATE_LIMITED".

F23:
- Falla abierta parcial: GoogleCloudTranslator devuelve hasErrors: true sin lanzar excepción. TranslationService reintenta 1 vez (500 ms). Si falla, el campo se marca enPendiente: true y se guarda el resto.
- Edición manual: no se re-traduce si el admin editó en (AC0.5.12). autoTranslate: true no pisa un en ya editado manualmente. Lógica de guarda por definir en TASKS.
- Caché: no implementada. Se llama al proveedor en cada operación de guarda con autoTranslate activo.

G24:
- Viven junto al test (colocado), nunca en src/**/__fakes__/ ni test/fakes/ por defecto.
- Fake de un solo test: definir inline en el .test.ts con vi.fn() / vi.mock().
- Fake reutilizado dentro de un mismo módulo: archivo *.fakes.ts hermano de los tests que lo usan.
- Solo promover a carpeta compartida (src/__fakes__/ o similar) si el fake es usado por 3+ test files de módulos distintos.

G25:
- Basta un fake de contrato para probar la mayoría de adaptadores (Firestore, R2, Resend, translator, etc.). Mockea el SDK con vi.mock() y valida que el adaptador traduce correctamente entre el mundo externo y los tipos de Application/Domain.
- Emulador de Firestore solo opcional: úsalo si necesitas validar consultas reales, índices compuestos o transacciones contra el comportamiento real de Firestore. No es requisito para cada adaptador.
- CI: corre npm test (Vitest) con mocks/fakes. No levanta emulador de Firebase. Si en el futuro se añaden pruebas de integración con emulador, deben ir en un script separado o job de CI con firebase emulators:start previo.

G26:
- El 80 % es global para packages/functions, no por carpeta ni por archivo.
- Configura coverage.thresholds en vitest.config.ts (líneas, funciones, ramas, sentencias al 80 %) para que el gate B5 sea real y no pasivo.
- Si activar los umbrales rompe el CI por cobertura insuficiente, corrige las brechas antes de mergear o programa un plan de cobertura. No mantengas el gate en "pasa en vacío".

H27:
Checklist canónico al añadir endpoint:
1. OpenAPI (docs/openapi.backend.yaml).
2. npm run build:types en packages/shared-types (codegen backend.gen.d.ts).
3. Si hay nuevo código de error: actualizar domain/errors/errorCatalog.ts, domain/errors/errorCatalog.contract.ts (assertion de tipos), packages/shared-types/errors.json (fuente única). Luego correr npm run sync:errors -w @jf/shared-types (regenera errors.d.ts) y npm run check:errors -w @jf/shared-types (verifica paridad de estados HTTP). No editar errors.d.ts directamente.
4. API_PATHS en presentation/paths.ts (satisfies ExpressPath).
5. Puerto en application/ports/ si necesita infraestructura nueva.
6. Caso de uso en application/use-cases/.
7. Handler en presentation/handlers/ (makeXHandler).
8. Registrar la ruta en presentation/routes.ts (array routes).
9. Wiring en buildUseCases.ts y buildHandlers (handlers/index.ts).
10. Tests (caso de uso + integración handler con supertest).
11. Docs si aplica.
Pasos que se olvidan sistemáticamente hoy: registrar en routes.ts, registrar en buildHandlers, wiring en buildUseCases, tests de integración. Al añadir un código de error: edita domain/errors/errorCatalog.ts, packages/shared-types/errors.json y ejecuta npm run sync:errors -w @jf/shared-types (regenera errors.d.ts) más npm run check:errors -w @jf/shared-types. No edites errors.d.ts a mano. Antes de marcar un endpoint como "hecho", verificar que aparece en los 3 sitios de wiring (paths.ts, routes.ts, handlers/index.ts + buildUseCases.ts).

H28:
Comandos antes de decir “listo”:
- Desde la raíz (workspaces): npm run typecheck, npm run lint, npm run test.
- Si tocaste packages/functions/src/**: además npm run test:coverage --workspace=@jf/functions (gate B5: ≥ 80 %).
- Si tocaste docs/openapi.backend.yaml: npm run build:types --workspace=@jf/shared-types.
- Si añadiste un código de error: npm run sync:errors -w @jf/shared-types y npm run check:errors -w @jf/shared-types (lanzados automáticamente por pretypecheck, pero verificarlos explícitamente).
- No digas “listo” si alguno de estos falla. Especialmente el typecheck de shared-types (paridad de errores) y la cobertura de packages/functions.

H29:
Actualización de TODOS.md:
El agente actualiza automáticamente este archivo al cerrar cada US. No es necesario que el usuario lo haga manualmente; el agente se encarga de cruzar el progreso con el checklist (B5–B9) y reflejar el estado real en docs/TODOS.md.

H30
Convención de commits y ramas:
- Commits: Convención estándar tipo(scope): descripción, descripción en español, tipos y scopes en inglés. Tipos: feat, fix, docs, style, refactor, perf, test.
- Rámas: main (producción), dev (desarrollo e integración), feature/* (nuevas funcionalidades), fix/* (correcciones), hotfix/* (parches críticos).
- Flujo:
    git checkout dev
  git pull origin dev
  git checkout -b feature/nombre-feature
  # ... desarrollar ...
  git add .
  git commit -m "tipo(scope): descripción en español"
  git push origin feature/nombre-feature
  # Abrir Pull Request manualmente en GitHub (merge a dev)
  - El PR se crea manualmente en GitHub y se fusiona a dev, no directamente a main.


I31:
Prohibiciones del agente en packages/functions:
- No tocar packages/client (frontend/BFF). El backend es packages/functions; el cliente es otro paquete.
- No cambiar contratos OpenAPI (docs/openapi.backend.yaml) sin aprobación explícita. Cualquier cambio requiere regenerar packages/shared-types/src/api/backend.gen.d.ts y validar paridad.
- No añadir dependencias (npm install / package.json) sin preguntar primero. Afecta a CI, cobertura, y al espacio de trabajo compartido.
- No desplegar (npm run deploy, firebase deploy, etc.) sin aprobación explícita del usuario.
- No editar firestore.rules ni firestore.indexes.json. Son configuración de infraestructura definida por el administrador del proyecto, no lógica de backend.
- No modificar package-lock.json manualmente; se actualiza con npm install.
- No crear .env con secretos ni commitear credenciales.

I32:
Añadir dependencias:
- No se añaden dependencias sin aprobación explícita del usuario. El agente nunca ejecuta npm install ni edita package.json / package-lock.json por iniciativa propia.
- Criterio obligatorio para cualquier nueva dependencia:
  1. Caso de uso documentado: hay una funcionalidad real y concreta que la requiere.
  2. Sin alternativas: no existe en el códigobase ni en dependencias ya instaladas una librería que resuelva el problema.
  3. Justificación escrita: antes de instalar, se presenta al usuario el motivo y se espera su aprobación.
- Proceso: el agente propone la adición → el usuario aprueba o rechaza → el agente instala y actualiza package-lock.json mediante npm install.
- Dependencias de desarrollo (vitest, eslint, etc.) siguen la misma regla: no se agregan sin aprobación.

I33:
Confirmación antes de refactors estructurales o migraciones de capas:
- Sí, siempre. Antes de cualquier refactor estructural o migración entre capas (mover código de Domain a Application, reescribir infrastructure, cambiar presentation, etc.), el agente debe proponer el plan y esperar confirmación explícita del usuario.
- No implementar sin luz verde. La fase de propuesta incluye: archivos afectados, alcance, riesgos, cambios en contratos, y plan de reversión si es necesario.
- Ejemplos que requieren confirmación:
  - Mover lógica entre Domain, Application, Presentation o Infrastructure.
  - Cambiar la forma en que se construyen los casos de uso (buildUseCases).
  - Reemplazar un adaptador de infraestructura (ej. Firestore → otra DB).
  - Renombrar o reorganizar carpetas de packages/functions/src.
- Sí implementar sin confirmación solo: cambios triviales, corregir errores puntuales dentro de un archivo ya existente sin tocar su estructura, o tareas explícitamente ordenadas por el usuario.


I34:
Idioma de AGENTS.md:
- Español, coherente con docs/ (BACKEND-ARCHITECTURE.md, ARCHITECTURE.md, contratos OpenAPI con descripciones en español) y con el idioma del usuario.
- Justificación: toda la documentación normativa del proyecto está en español; mantener AGENTS.md en el mismo idioma evita ambigüedades y asegura que el agente y el usuario se entiendan sin traducción.
- Convención: escribir el AGENTS.md en español, salvo nombres técnicos (clases, funciones, archivos, comandos) que se dejan en inglés tal como aparecen en el código.

I35:
Relación con .opencoderules:
- Sí, conviven. No es necesario eliminar .opencoderules.
- AGENTS.md es la fuente canónica para el agente (instrucciones, reglas de arquitectura, checklists, DoD). Es portable y legible por cualquier agente/IA.
- .opencoderules permanece solo si OpenCode/OMO lo requiere para configuración específica de la herramienta (permisos, MCP, etc.).
- Prioridad en caso de conflicto: AGENTS.md prevalece sobre .opencoderules, igual que ocurre hoy con docs/BACKEND-ARCHITECTURE.md.
- Recomendación práctica: migrar las reglas de comportamiento del agente a AGENTS.md y dejar .opencoderules únicamente para configuración técnica de OpenCode (si existe y se usa). Si .opencoderules solo contiene instrucciones del agente, puede dejarse vacío o eliminar sin impacto.


No haremos un AGENTS.md para la raiz del proyecto ni un CLAUDE.md en packages/functions