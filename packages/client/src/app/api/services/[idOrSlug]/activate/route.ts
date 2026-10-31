/**
 * POST /api/services/{idOrSlug}/activate → /api/v1/services/{idOrSlug}/activate (session).
 */

import { bffRoute, delegateToBackend } from '@/server/bff-helper';

const handler = bffRoute(
  async (request, ctx, { params }: { params: Promise<{ idOrSlug: string }> }) => {
    const { idOrSlug } = await params;
    return delegateToBackend(request, ctx, { idOrSlug });
  },
);

export const POST = handler;
