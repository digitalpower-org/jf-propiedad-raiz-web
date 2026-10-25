/**
 * MT1.1 PLENUM ESTRUCTURAL — endpoint `POST /api/auth/session`.
 *
 * CONTRATO MT1.2: el canje del idToken de Firebase contra la lista blanca
 * `authorized_users` (Firestore), la validación del JWT HS256 de sesión y la
 * emisión de la cookie HttpOnly `__session` pertenecen exclusivamente a MT1.2.
 *
 * MT1.1 solo crea este esqueleto para que la ruta exista en el catálogo BFF
 * y pase validación de contrato OpenAPI. Nada se ejecuta todavía.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { errorEnvelope } from '@/server/bff-helper';

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  // MT1.1: placeholder. El canje JWT + emisión cookie es MT1.2 (US1.2).
  return errorEnvelope('PENDING', 'Endpoint pendiente de implementación en MT1.2', 501);
};