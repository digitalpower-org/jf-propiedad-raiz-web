/**
 * POST /api/revalidate — revalidación interna tras escrituras (AC0.3.1–AC0.3.4).
 *
 * La `X-Internal-Key` la exige el envoltorio del catálogo (`auth: internal`).
 * Si la revalidación falla, la escritura no se revierte; solo se registra.
 */

import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { bffRoute, envelope, errorEnvelope } from '@/server/bff-helper';

interface RevalidateBody {
  paths?: string[];
  tags?: string[];
}

export const POST = bffRoute(async (request) => {
  let body: RevalidateBody;
  try {
    body = (await request.json()) as RevalidateBody;
  } catch {
    return errorEnvelope('VALIDATION_ERROR', 'Cuerpo JSON inválido.', 422, ['body: JSON inválido']);
  }

  const revalidateErrors: string[] = [];
  let revalidatedCount = 0;

  if (body.paths && Array.isArray(body.paths)) {
    for (const path of body.paths) {
      for (const localePath of toLocalizedPaths(path)) {
        try {
          revalidatePath(localePath);
          revalidatedCount++;
        } catch (err) {
          revalidateErrors.push(
            `path="${path}" (${localePath}): ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }
  }

  if (body.tags && Array.isArray(body.tags)) {
    for (const tag of body.tags) {
      try {
        revalidateTag(tag, {});
        revalidatedCount++;
      } catch (err) {
        revalidateErrors.push(`tag="${tag}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  const data = {
    revalidated: revalidatedCount,
    failed: revalidateErrors.length,
    errors: revalidateErrors,
  };

  if (revalidateErrors.length > 0) {
    return NextResponse.json({ success: false, data, message: 'Revalidación parcial' });
  }

  return envelope(data, 200, 'Revalidación completada');
});

/**
 * Genera las variantes en ambos idiomas (/es y /en) de una ruta.
 * Si la ruta ya incluye prefijo de locale, se reemplaza; si no, se agrega.
 */
function toLocalizedPaths(path: string): string[] {
  const cleanPath = path.replace(/^\/(es|en)\//, '');
  return [`/es${cleanPath}`, `/en${cleanPath}`];
}
