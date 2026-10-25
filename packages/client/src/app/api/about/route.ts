/**
 * MT1.1 PLENUM ESTRUCTURAL — endpoints de la página Nosotros.
 *
 * GET  /api/about → /api/v1/about
 * PUT /api/about → /api/v1/about
 *
 * MT1.2: PUT exige `security: session`.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { delegateToBackend, buildContext } from '@/server/bff-helper';

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const ctx = buildContext(request);
  return delegateToBackend(request, '/api/v1/about', ctx);
};

export const PUT = async (request: NextRequest): Promise<NextResponse> => {
  const ctx = buildContext(request);
  return delegateToBackend(request, '/api/v1/about', ctx);
};