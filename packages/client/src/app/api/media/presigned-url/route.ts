/**
 * POST /api/media/presigned-url → /api/v1/media/presigned-url (session).
 */

import { bffRoute, delegateToBackend } from '@/server/bff-helper';

export const POST = bffRoute((request, ctx) => delegateToBackend(request, ctx));
