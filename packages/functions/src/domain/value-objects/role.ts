import { z } from 'zod';

/**
 * Roles de la lista blanca (`authorized_users`).
 *
 * El contrato actual solo distingue `admin`; cualquier sesión es de
 * administrador y los visitantes no tienen sesión.
 */
export const ROLES = ['admin'] as const;

const roleSchema = z.enum(ROLES);

export type Role = z.infer<typeof roleSchema>;

/** Frontera de validación: normaliza y lanza `ZodError` si el rol no existe. */
export const parseRole = (input: unknown): Role => roleSchema.parse(input);
