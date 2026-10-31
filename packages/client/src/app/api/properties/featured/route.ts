/**
 * GET /api/properties/featured → /api/v1/properties/featured (public).
 */

import { bffRoute, delegateToBackend } from '@/server/bff-helper';

export const GET = bffRoute((request, ctx) => delegateToBackend(request, ctx));
