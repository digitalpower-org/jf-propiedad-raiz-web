/**
 * Endpoints de la página Nosotros.
 *
 * GET /api/about → /api/v1/about (public)
 * PUT /api/about → /api/v1/about (session)
 */

import { bffRoute, delegateToBackend } from '@/server/bff-helper';

export const GET = bffRoute((request, ctx) => delegateToBackend(request, ctx));

export const PUT = bffRoute((request, ctx) => delegateToBackend(request, ctx));
