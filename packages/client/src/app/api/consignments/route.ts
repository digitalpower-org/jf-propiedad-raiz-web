/**
 * MT1.1 PLENUM ESTRUCTURAL — POST /api/consignments.
 *
 * MT1.2: validación de bot, notificación con Resend (US3.1–US3.4).
 * MT1.1: delega con headers placeholder X-Internal-Key + X-Client-IP.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { delegateToBackend, buildContext } from '@/server/bff-helper';

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const ctx = buildContext(request);
  return delegateToBackend(request, '/api/v1/consignments', ctx);
};
