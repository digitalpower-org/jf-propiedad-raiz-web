/**
 * MT1.1 PLENUM ESTRUCTURAL — endpoints de media.
 *
 * POST /api/media/presigned-url → /api/v1/media/presigned-url
 * POST /api/media/confirm      → /api/v1/media/confirm
 *
 * MT1.2: validación `X-User-Role: admin` (AC1.8.1).
 */

import { type NextRequest, NextResponse } from 'next/server';

import { delegateToBackend, buildContext } from '@/server/bff-helper';

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const ctx = buildContext(request);
  return delegateToBackend(request, '/api/v1/media/presigned-url', ctx);
};
