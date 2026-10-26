/**
 * MT1.1 PLENUM ESTRUCTURAL — POST /api/revalidate.
 *
 * Ruta protegida por `security: internal` (X-Internal-Key).
 * Consumida por Cloud Functions para revalidar tras escrituras (AC0.3.1, AC0.3.3).
 * No exige cookie de sesión.
 *
 * Ejecuta revalidatePath/revalidateTag de Next.js sobre las rutas/etiquetas
 * afectadas en ambos idiomas (es/en). Si falta body o validación, devuelve error.
 * Si la revalidación falla, la escritura no se revierte; solo se registra (AC0.3.4).
 */

import { revalidatePath, revalidateTag } from 'next/cache';

import { type NextRequest, NextResponse } from 'next/server';

import { errorEnvelope } from '@/server/bff-helper';

export const POST = async (request: NextRequest): Promise<NextResponse> => {
  // Validar internal key (AC0.3.3: sin secreto → 401)
  const internalKey = request.headers.get('x-internal-key');
  const expectedKey = process.env.BFF_INTERNAL_KEY ?? 'placeholder-internal-key';

  if (!internalKey || internalKey !== expectedKey) {
    return errorEnvelope('UNAUTHORIZED', 'Clave interna inválida o ausente', 401);
  }

  // Parsear body: { paths?: string[], tags?: string[] }
  let body: { paths?: string[]; tags?: string[] };
  try {
    body = (await request.json()) as { paths?: string[]; tags?: string[] };
  } catch {
    return errorEnvelope('BAD_REQUEST', 'Cuerpo JSON inválido', 400);
  }

  // Ejecutar revalidación
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

  // Responder
  if (revalidateErrors.length > 0) {
    const data = {
      revalidated: revalidatedCount,
      failed: revalidateErrors.length,
      errors: revalidateErrors,
    };
    return NextResponse.json({ success: false, data, error: null }, { status: 200 });
  }

  const data = { revalidated: revalidatedCount, failed: 0, errors: [] as string[] };
  return NextResponse.json({ success: true, data, error: null }, { status: 200 });
};

/**
 * Genera las variantes en ambos idiomas (/es y /en) de una ruta.
 * Si la ruta ya incluye prefijo de locale, se reemplaza; si no, se agrega.
 */
function toLocalizedPaths(path: string): string[] {
  const cleanPath = path.replace(/^\/(es|en)\//, '');
  return [`/es${cleanPath}`, `/en${cleanPath}`];
}
