import { z } from 'zod';

/**
 * Schema Zod compartido para campos Translatable.
 * Se usa en handlers de properties, services y about para evitar duplicación
 * del objeto { es: z.string(), en: z.string().optional() }.
 */
export const translatableSchema = z.object({
  es: z.string().min(1),
  en: z.string().optional(),
});

export const optionalTranslatableSchema = translatableSchema.optional();

/**
 * Schema para campos traducibles de entrada (DTO de entrada).
 * `es` es obligatorio y no vacío. `en` y `autoTranslate` son opcionales.
 * `.strict()` rechaza campos extra como `enPendiente` con 422.
 */
export const translatableInputSchema = z
  .object({
    es: z.string().min(1),
    en: z.string().optional(),
    autoTranslate: z.boolean().optional(),
  })
  .strict();

/**
 * Schema para campos traducibles de entrada que pueden estar vacíos (clearable).
 * `es` puede ser string vacío. `en` y `autoTranslate` son opcionales.
 * `.strict()` rechaza campos extra como `enPendiente` con 422.
 */
export const clearableTranslatableInputSchema = z
  .object({
    es: z.string(),
    en: z.string().optional(),
    autoTranslate: z.boolean().optional(),
  })
  .strict();

export const optionalClearableTranslatableInputSchema = clearableTranslatableInputSchema.optional();
