/**
 * MT1.1 PLENUM ESTRUCTURAL — POST /api/revalidate.
 *
 * Ruta protegida por `security: internal` (X-Internal-Key).
 * Consumida por Cloud Functions para revalidar tras escrituras (AC0.3.1, AC0.3.3).
 * No exige cookie de sesión.
 */

import { type NextRequest, NextResponse } from 'next/server';

import { errorEnvelope } from '@/server/bff-helper';

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  // MT1.1: placeholder. MT1.2: usar Next.js revalidatePath/revalidateTag.
  return errorEnvelope('PENDING', 'Revalidación pendiente de MT1.2', 501);
};
