/**
 * MT1.1 PLENUM ESTRUCTURAL — endpoint `GET /api/auth/me`.
 *
 * CONTRATO MT1.2: valida cookie `__session` propia del BFF, responde
 * identidad+rol. MT1.1 solo devuelve placeholder por si la ruta está declarada
 * en el catálogo.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { envelope } from '@/server/bff-helper';

export const GET = (request: NextRequest): NextResponse => {
  // MT1.1: placeholder. La identidad real se obtiene en MT1.2 de la cookie `__session`.
  const placeholder: Record<string, unknown> = { user: null, authenticated: false };
  return envelope(placeholder);
};
