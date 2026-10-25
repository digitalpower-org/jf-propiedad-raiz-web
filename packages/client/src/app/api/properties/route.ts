/**
 * MT1.1 PLENUM ESTRUCTURAL — endpoints de inmuebles.
 *
 * GET  /api/properties                  → /api/v1/properties
 * POST /api/properties                  → /api/v1/properties
 * GET  /api/properties/featured         → /api/v1/properties/featured
 *
 * MT1.2: los handlers que exigen `security: session` (POST, PUT, DELETE,
 * activate, hide) validan la cookie `__session` y propagan `X-User-*`.
 * MT1.1 solo delega con headers placeholder.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { delegateToBackend, buildContext, errorEnvelope } from '@/server/bff-helper';

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const ctx = buildContext(request);
  return delegateToBackend(request, '/api/v1/properties', ctx);
};

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  // MT1.2: aquí se valida `security: session` (cookie `__session`).
  const ctx = buildContext(request);
  return delegateToBackend(request, '/api/v1/properties', ctx);
};