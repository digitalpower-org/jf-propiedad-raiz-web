import { z } from 'zod';

/**
 * Catálogo cerrado de tipo de inmueble (MODELO DE DATOS, TASKS).
 * Coincide con `shared-types/src/models/common.d.ts` (`TipoInmueble`).
 */
export const TIPOS_INMUEBLE = [
  'CASA',
  'APARTAMENTO',
  'LOTE_CAMPESTRE',
  'LOTE_URBANO',
  'FINCA',
  'LOCAL_COMERCIAL',
  'BODEGA',
  'OFICINA',
] as const;

const tipoPropiedadSchema = z.enum(TIPOS_INMUEBLE);

export type TipoPropiedad = z.infer<typeof tipoPropiedadSchema>;

/** Frontera de validación: normaliza y lanza `ZodError` si el tipo no existe. */
export const parseTipoPropiedad = (input: unknown): TipoPropiedad =>
  tipoPropiedadSchema.parse(input);
