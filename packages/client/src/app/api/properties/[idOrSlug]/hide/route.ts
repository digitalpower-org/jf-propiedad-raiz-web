/**
 * POST /api/properties/{idOrSlug}/hide → /api/v1/properties/{idOrSlug}/hide (session).
 */

import { bffRoute, delegateToBackend } from '@/server/bff-helper';

const handler = bffRoute(
  async (request, ctx, { params }: { params: Promise<{ idOrSlug: string }> }) => {
    const { idOrSlug } = await params;
    return delegateToBackend(request, ctx, { idOrSlug });
  },
);

export const POST = handler;
