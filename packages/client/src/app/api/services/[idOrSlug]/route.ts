/**
 * Endpoints de servicio por idOrSlug.
 *
 * GET    /api/services/{idOrSlug} → /api/v1/services/{idOrSlug} (public)
 * PUT    /api/services/{idOrSlug} → /api/v1/services/{idOrSlug} (session)
 * DELETE /api/services/{idOrSlug} → /api/v1/services/{idOrSlug} (session)
 */

import { bffRoute, delegateToBackend } from '@/server/bff-helper';

const handler = bffRoute(
  async (request, ctx, { params }: { params: Promise<{ idOrSlug: string }> }) => {
    const { idOrSlug } = await params;
    return delegateToBackend(request, ctx, { idOrSlug });
  },
);

export const GET = handler;
export const PUT = handler;
export const DELETE = handler;
