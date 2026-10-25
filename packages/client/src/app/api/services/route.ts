/**
 * MT1.1 PLENUM ESTRUCTURAL — endpoints de servicios.
 *
 * GET  /api/services              → /api/v1/services
 * POST /api/services              → /api/v1/services
 * GET  /api/services/{idOrSlug}   → /api/v1/services/{idOrSlug}
 * PUT  /api/services/{idOrSlug}   → /api/v1/services/{idOrSlug}
 * DELETE /api/services/{idOrSlug} → /api/v1/services/{idOrSlug}
 * POST /api/services/{idOrSlug}/activate → /api/v1/.../activate
 * POST /api/services/{idOrSlug}/hide     → /api/v1/.../hide
 * POST /api/services/reorder          → /api/v1/services/reorder
 *
 * MT1.2: handlers con `security: session` validan cookie `__session`.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { delegateToBackend, buildContext } from '@/server/bff-helper';

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const ctx = buildContext(request);
  return delegateToBackend(request, '/api/v1/services', ctx);
};

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const ctx = buildContext(request);
  return delegateToBackend(request, '/api/v1/services', ctx);
};
