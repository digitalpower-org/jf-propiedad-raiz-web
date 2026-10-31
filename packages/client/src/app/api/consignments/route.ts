/**
 * POST /api/consignments → /api/v1/consignments (public).
 */

import { bffRoute, delegateToBackend } from '@/server/bff-helper';

export const POST = bffRoute((request, ctx) => delegateToBackend(request, ctx));
