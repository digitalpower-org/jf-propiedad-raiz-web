/**
 * MT1.1 PLENUM ESTRUCTURAL — POST /api/services/reorder.
 *
 * MT1.2: exige `security: session`.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { delegateToBackend, buildContext } from '@/server/bff-helper';

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const ctx = buildContext(request);
  return delegateToBackend(request, '/api/v1/services/reorder', ctx);
};