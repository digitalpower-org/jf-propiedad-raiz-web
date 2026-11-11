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
