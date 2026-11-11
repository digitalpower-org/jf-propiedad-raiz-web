import { z } from 'zod';

/**
 * Precio en COP, entero y mayor que 0 (AC1.7.4).
 * Coincide con `shared-types/src/models/common.d.ts` (campo `precio` de `Property`).
 */
const precioSchema = z
  .number()
  .int()
  .positive('El precio debe ser un entero mayor que 0')
  .max(Number.MAX_SAFE_INTEGER)
  .brand<'Precio'>();

export type Precio = z.infer<typeof precioSchema>;

/** Frontera de validación: normaliza y lanza `ZodError` si el precio no es válido. */
export const parsePrecio = (input: unknown): Precio => precioSchema.parse(input);
