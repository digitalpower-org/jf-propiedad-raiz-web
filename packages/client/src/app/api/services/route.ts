/**
 * Endpoints de servicios.
 *
 * GET  /api/services → /api/v1/services  (public)
 * POST /api/services → /api/v1/services  (session)
 */

import { bffRoute, delegateToBackend } from '@/server/bff-helper';

export const GET = bffRoute((request, ctx) => delegateToBackend(request, ctx));

export const POST = bffRoute((request, ctx) => delegateToBackend(request, ctx));
