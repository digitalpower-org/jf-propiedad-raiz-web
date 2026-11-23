import { z } from 'zod';

import { OPERACIONES } from '../../domain/value-objects/operacion';
import { TIPOS_INMUEBLE } from '../../domain/value-objects/tipo-propiedad';
import { translatableInputSchema, optionalClearableTranslatableInputSchema } from './translatable';

/**
 * Catálogo cerrado de amenidades (desde @jf/shared-types).
 * Ampliarlo requiere cambiar el tipo compartido.
 */
export const AMENIDADES = ['PISCINA', 'CANCHA', 'GIMNASIO'] as const;

/**
 * Categorías predefinidas de puntos de interés (desde @jf/shared-types).
 * Ampliarlo requiere cambiar el tipo compartido.
 */
export const PUNTO_INTERES_CATEGORIAS = [
  'EDUCACION',
  'GIMNASIO',
  'ZONA_COMERCIAL',
  'AVENIDA_PRINCIPAL',
  'TRANSPORTE_PUBLICO',
  'SALUD',
] as const;

/**
 * Schema base compartido para campos de entrada de propiedad (create y update).
 * Contiene validaciones comunes: enums cerrados, límite de videos, formato de fecha.
 */
export const propertyInputBaseSchema = z.object({
  operacion: z.enum(OPERACIONES),
  tipo: z.enum(TIPOS_INMUEBLE),
  titulo: translatableInputSchema,
  descripcion: optionalClearableTranslatableInputSchema,
  precio: z.number().int().positive(),
  departamento: z.string().min(1),
  municipio: z.string().min(1),
  estrato: z.number().int().min(1).max(6).optional(),
  predial: z.string().min(1).optional(),
  administracion: z.string().min(1).optional(),
  acabados: optionalClearableTranslatableInputSchema,
  antiguedad: z.string().min(1).optional(),
  areaConstruida: z.number().positive().optional(),
  areaLote: z.number().positive().optional(),
  dormitorios: z.number().int().nonnegative().optional(),
  banos: z.number().int().nonnegative().optional(),
  parqueaderos: z.number().int().nonnegative().optional(),
  deposito: z.number().int().nonnegative().optional(),
  amenidades: z.array(z.enum(AMENIDADES)).optional(),
  puntosInteres: z
    .array(
      z.object({
        categoria: z.enum(PUNTO_INTERES_CATEGORIAS).optional(),
        etiqueta: translatableInputSchema,
      }),
    )
    .optional(),
  fotos: z
    .array(
      z.object({
        derivados: z
          .array(
            z.object({
              clave: z.string().min(1),
              ancho: z.number().int().positive(),
              alto: z.number().int().positive(),
            }),
          )
          .nonempty(),
      }),
    )
    .optional(),
  videos: z.array(z.string()).max(2).optional(),
  panoramas: z
    .array(
      z.object({
        derivados: z
          .array(
            z.object({
              clave: z.string().min(1),
              ancho: z.number().int().positive(),
              alto: z.number().int().positive(),
            }),
          )
          .nonempty(),
      }),
    )
    .max(3)
    .refine(
      (panoramas) =>
        panoramas.every((p) =>
          p.derivados.every((d) => d.ancho / d.alto >= 1.98 && d.ancho / d.alto <= 2.02),
        ),
      {
        message: 'Cada derivado de una panorámica debe tener proporción 2:1 ±1 %',
      },
    )
    .optional(),
  destacada: z.boolean().optional(),
  proyecto: z
    .object({
      etapa: optionalClearableTranslatableInputSchema,
      fechaEntregaEstimada: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .optional(),
      unidadesDisponibles: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

/**
 * Schema para creación de propiedad (todos los campos requeridos obligatorios).
 */
export const createPropertyInputSchema = propertyInputBaseSchema;

/**
 * Schema para actualización de propiedad (todos los campos opcionales).
 */
export const updatePropertyInputSchema = propertyInputBaseSchema.partial();

/**
 * Tipo inferido del schema base de entrada de propiedad.
 */
export type PropertyInputBase = z.infer<typeof propertyInputBaseSchema>;

/**
 * Tipo inferido del schema de creación de propiedad.
 */
export type CreatePropertyInput = z.infer<typeof createPropertyInputSchema>;

/**
 * Tipo inferido del schema de actualización de propiedad.
 */
export type UpdatePropertyInput = z.infer<typeof updatePropertyInputSchema>;
