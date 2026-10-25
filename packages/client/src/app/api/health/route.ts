/**
 * MT1.1 — Health check del BFF con agregación de Functions.
 *
 * GET /api/health → Verifica BFF + Functions.
 * La lógica pura vive en @/server/health (testeable con vitest).
 */

import { type NextRequest, NextResponse } from 'next/server';

import { getHealth } from '@/server/health';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const { body, status } = await getHealth();

  return NextResponse.json({ success: status < 400, data: body, error: null }, { status });
}
