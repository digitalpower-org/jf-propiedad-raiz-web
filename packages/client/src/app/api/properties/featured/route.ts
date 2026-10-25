/**
 * MT1.1 PLENUM ESTRUCTURAL — GET /api/properties/featured.
 *
 * Devuelve hasta 12 inmuebles ACTIVE con `orden` ascendente (US1.10).
 * Ruta pública (security: []).
 */

import { type NextRequest, NextResponse } from 'next/server';

import { delegateToBackend, buildContext } from '@/server/bff-helper';

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const ctx = buildContext(request);
  return delegateToBackend(request, '/api/v1/properties/featured', ctx);
};