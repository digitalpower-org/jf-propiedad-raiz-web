import { z } from 'zod';

/**
 * Slug generado del título en español + código; mismo en ambos idiomas (AC0.4.7).
 * Coincide con `shared-types/src/models/property.d.ts` (campo `slug`).
 */
const slugSchema = z
  .string()
  .min(1, 'El slug es obligatorio')
  .max(200, 'El slug no puede exceder 200 caracteres')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'El slug solo acepta minúsculas, números y guiones')
  .brand<'Slug'>();

export type Slug = z.infer<typeof slugSchema>;

/** Frontera de validación: normaliza y lanza `ZodError` si el slug no es válido. */
export const parseSlug = (input: unknown): Slug => slugSchema.parse(input);
