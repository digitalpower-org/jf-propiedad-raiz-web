# ADR-001: Validación de body y parámetros en el BFF con Zod

## Estado

Accepted

## Contexto

El BFF (packages/client) actúa como fachada entre el frontend web y Cloud Functions. Actualmente los route handlers de Next.js (`app/api/*/route.ts`) leen `process.env` directamente y no existe un punto único de validación de los datos de entrada (body, query, params, headers).

Sin validación en la frontera:
- Los datos inválidos llegan al backend/Functions generando errores impredecibles.
- El frontend recibe respuestas genéricas o 500 en lugar de 400 claros.
- No hay un único sitio donde quede explícito el contrato de entrada del BFF.

## Decisión

Validar los datos de entrada en la frontera del BFF usando **Zod** y los schemas almacenados en `packages/client/src/server/schemas/`.

### Principios acordados

1. **Schemas en `server/schemas/`**: Todos los schemas de validación del BFF viven en `packages/client/src/server/schemas/` para que sean reutilizables y estén centralizados.
2. **`.safeParse()` en route handlers**: Cada route handler usa `Schema.safeParse(body|query|params)` al recibir la petición para validar y tipar la entrada antes de procesarla.
3. **Validación en la frontera**: Si la validación falla, el BFF responde inmediatamente con **400 Bad Request** y un mensaje estructurado (ver `bff-helper.errorEnvelope`). El request nunca llega al backend con datos inválidos.
4. **Datos validados hacia el backend**: Solo se reenvía al backend/Functions el objeto ya parseado y normalizado por Zod (`parsed.data`), tipado y confiable.
5. **Sin lógica de negocio del dominio**: El BFF valida *solo lo necesario para cumplir su contrato* (shape, tipos requeridos, enums, rangos básicos). Las reglas de dominio complejas (ej. "no se puede borrar una propiedad con reservas activas") quedan en Cloud Functions.
6. **Defensa en profundidad**: El backend (Cloud Functions) **también mantiene sus propias validaciones**. El BFF no asume que el backend confía ciegamente; ambos validan.
7. **Opción futura `.transform()` + `.brand()`**: Si en el futuro surge la necesidad de garantizar invariantes más allá de Zod (por ejemplo, un email normalizado o un ID con formato específico que se pasa por múltiples capas del BFF), se pueden usar `.transform()` + `.brand()` para crear *branded types* / Value Objects ligeros sin recurrir a clases con constructor privado.

### Estructura propuesta

```
packages/client/src/server/schemas/
├── auth.schema.ts
├── propiedades.schema.ts
├── revalidate.schema.ts
├── ...
└── index.ts  (opcional, para exportar todo)
```

### Ejemplo de uso

```ts
import { z } from 'zod';
import { type NextRequest, NextResponse } from 'next/server';
import { errorEnvelope } from '@/server/bff-helper';
import { CreatePropertySchema } from '@/server/schemas/propiedades';

const CreatePropertySchema = z.object({
  title: z.string().min(5).max(120),
  price: z.coerce.number().positive(),
  type: z.enum(['venta', 'alquiler']),
});

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return errorEnvelope('BAD_REQUEST', 'Body JSON inválido', 400);
  }

  const parsed = CreatePropertySchema.safeParse(json);
  if (!parsed.success) {
    return errorEnvelope('BAD_REQUEST', 'Datos de solicitud inválidos', 400);
  }

  const data = parsed.data; // tipado y validado
  // reenviar `data` a Cloud Functions
};
```

## Alternativas consideradas

| Alternativa | Resultado | Motivo |
|---|---|---|
| Validar solo en el backend (Cloud Functions) | Rechazada | Deja al frontend sin retroalimentación rápida y expone el backend a datos malformados. |
| Validar directamente en cada route handler sin schemas centralizados | Rechazada | Dificulta reutilización y hace menos visible el contrato del BFF. |
| Usar clases con Value Objects (constructor privado) desde el día 1 | Aplazada | Sobre-ingeniería para el momento actual. Zod + branded types basta y es menos boilerplate. Se deja la puerta abierta con `.transform()` + `.brand()`. |

## Consecuencias

- **Positivas**: Errores 400 claros, datos tipados al entrar al BFF, contrato expuesto explícito, menos llamadas innecesarias al backend.
- **Negativas**: Más archivos/schemas que mantener; ligero acoplo a Zod en la capa de presentación del servidor.
- **Riesgo**: Olvidar validar algún route handler nuevo. Se debe revisar en PR.

## Relación con otros registros

- Relacionado con **server-config.ts** (SSOT de variables de entorno y configuración del servidor).
- Relacionado con futura decisión de Value Objects / branded types (`server/schemas/` es el sitio natural para ellos).
