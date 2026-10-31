/**
 * POST /api/services/reorder → /api/v1/services/reorder (session).
 */

import { bffRoute, delegateToBackend } from '@/server/bff-helper';

export const POST = bffRoute((request, ctx) => delegateToBackend(request, ctx));
