/**
 * MT1.1 PLENUM ESTRUCTURAL — endpoints de inmueble por idOrSlug.
 *
 * GET    /api/properties/{idOrSlug} → /api/v1/properties/{idOrSlug}
 * PUT    /api/properties/{idOrSlug} → /api/v1/properties/{idOrSlug}
 * DELETE /api/properties/{idOrSlug} → /api/v1/properties/{idOrSlug}
 * POST   /api/properties/{idOrSlug}/activate → /api/v1/.../activate
 * POST   /api/properties/{idOrSlug}/hide     → /api/v1/.../hide
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
  return delegateToBackend(request, `/api/v1/properties/${idOrSlug}`, ctx);
};

export const PUT = async (
  request: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
): Promise<NextResponse> => {
  const { idOrSlug } = await params;
  const ctx = buildContext(request);
  return delegateToBackend(request, `/api/v1/properties/${idOrSlug}`, ctx);
};

export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
): Promise<NextResponse> => {
  const { idOrSlug } = await params;
  const ctx = buildContext(request);
  return delegateToBackend(request, `/api/v1/properties/${idOrSlug}`, ctx);
};

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
): Promise<NextResponse> => {
  const { idOrSlug } = await params;
  const ctx = buildContext(request);
  return delegateToBackend(request, `/api/v1/properties/${idOrSlug}`, ctx);
};