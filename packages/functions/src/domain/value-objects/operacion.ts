import { z } from 'zod';

/**
 * Operación de la pestaña (D8). `PROYECTO_SOBRE_PLANOS` añade campos propios (D20).
 * Coincide con `shared-types/src/models/common.d.ts` (`Operacion`).
 */
export const OPERACIONES = ['VENTA', 'ALQUILER', 'PROYECTO_SOBRE_PLANOS'] as const;

const operacionSchema = z.enum(OPERACIONES);

export type Operacion = z.infer<typeof operacionSchema>;

/** Frontera de validación: normaliza y lanza `ZodError` si la operación no existe. */
export const parseOperacion = (input: unknown): Operacion => operacionSchema.parse(input);
