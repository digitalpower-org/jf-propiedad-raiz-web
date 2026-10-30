/**
 * Endpoints de inmueble por idOrSlug.
 *
 * GET    /api/properties/{idOrSlug} → /api/v1/properties/{idOrSlug} (public)
 * PUT    /api/properties/{idOrSlug} → /api/v1/properties/{idOrSlug} (session)
 * DELETE /api/properties/{idOrSlug} → /api/v1/properties/{idOrSlug} (session)
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
