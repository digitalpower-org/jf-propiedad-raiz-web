/**
 * POST /api/media/confirm → /api/v1/media/confirm (session).
 */

import { bffRoute, delegateToBackend } from '@/server/bff-helper';

export const POST = bffRoute((request, ctx) => delegateToBackend(request, ctx));
