/**
 * MT1.1 PLENUM ESTRUCTURAL — endpoints de servicio por idOrSlug.
 *
 * GET    /api/services/{idOrSlug} → /api/v1/services/{idOrSlug}
 * PUT    /api/services/{idOrSlug} → /api/v1/services/{idOrSlug}
 * DELETE /api/services/{idOrSlug} → /api/v1/services/{idOrSlug}
 * POST   /api/services/{idOrSlug}/activate → /api/v1/.../activate
 * POST   /api/services/{idOrSlug}/hide     → /api/v1/.../hide
 *
 * MT1.2: PUT/DELETE/activate/hide exigen `security: session`.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { delegateToBackend, buildContext } from '@/server/bff-helper';

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
): Promise<NextResponse> => {
  const { idOrSlug } = await params;
  const ctx = buildContext(request);
  return delegateToBackend(request, `/api/v1/services/${idOrSlug}`, ctx);
};

export const PUT = async (
  request: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
): Promise<NextResponse> => {
  const { idOrSlug } = await params;
  const ctx = buildContext(request);
  return delegateToBackend(request, `/api/v1/services/${idOrSlug}`, ctx);
};

export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
): Promise<NextResponse> => {
  const { idOrSlug } = await params;
  const ctx = buildContext(request);
  return delegateToBackend(request, `/api/v1/services/${idOrSlug}`, ctx);
};

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
): Promise<NextResponse> => {
  const { idOrSlug } = await params;
  const ctx = buildContext(request);
  return delegateToBackend(request, `/api/v1/services/${idOrSlug}`, ctx);
};
