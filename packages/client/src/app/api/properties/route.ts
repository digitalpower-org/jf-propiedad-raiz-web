/**
 * Endpoints de inmuebles.
 *
 * GET  /api/properties → /api/v1/properties  (public)
 * POST /api/properties → /api/v1/properties  (session)
 */

import { bffRoute, delegateToBackend } from '@/server/bff-helper';

export const GET = bffRoute((request, ctx) => delegateToBackend(request, ctx));

export const POST = bffRoute((request, ctx) => delegateToBackend(request, ctx));
