import sharp from 'sharp';

import type { ImageProcessor } from '../../application/ports/image-processor';
import type {
  DerivadoImagenProcesado,
  DerivadosImagenResult,
} from '../../application/ports/image-processor';
import { ApiError } from '../../domain/errors/api-error';
import { errorCode } from '../../domain/errors/errorCatalog';

/**
 * Tamaños de derivados WebP (AGENTS.md §9): 320, 640, 1280, 2048 o tamaño completo.
 */
const DERIVADOS_ANCHOS = [320, 640, 1280, 2048] as const;

/** Lado mayor mínimo permitido (AC1.9.6, IMAGE_TOO_SMALL). */
const LADO_MAYOR_MINIMO = 800;

/** Tope de píxeles totales (ancho × alto) para evitar imágenes excesivas. */
const PIXELES_MAXIMOS = 50_000_000; // 50 MP

/** MIME types permitidos. */
const MIME_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * Adaptador Sharp de `ImageProcessor`.
 *
 * Valida y transforma imágenes en memoria. No conoce Express, HTTP ni R2.
 * Lanza ApiError con códigos específicos para fallos de validación esperados.
 */
export function createSharpImageProcessor(): ImageProcessor {
  async function validarImagen(
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ readonly ancho: number; readonly alto: number }> {
    // Validar MIME type
    if (!MIME_PERMITIDOS.includes(mimeType as (typeof MIME_PERMITIDOS)[number])) {
      throw new ApiError(errorCode.unsupportedMedia, 'Tipo de contenido no soportado', [
        { field: 'mimeType', issue: `Tipo no permitido: ${mimeType}` },
      ]);
    }

    const metadata = await sharp(buffer).metadata();

    const ancho = metadata.width ?? 0;
    const alto = metadata.height ?? 0;

    if (ancho === 0 || alto === 0) {
      throw new ApiError(errorCode.validationError, 'Imagen sin dimensiones válidas', [
        { field: 'image', issue: 'No se pudieron leer las dimensiones' },
      ]);
    }

    const ladoMayor = Math.max(ancho, alto);

    if (ladoMayor < LADO_MAYOR_MINIMO) {
      throw new ApiError(
        errorCode.imageTooSmall,
        `Imagen demasiado pequeña: lado mayor ${ladoMayor}px, mínimo ${LADO_MAYOR_MINIMO}px`,
        [{ field: 'image', issue: `Lado mayor ${ladoMayor}px < ${LADO_MAYOR_MINIMO}px` }],
      );
    }

    const pixeles = ancho * alto;
    if (pixeles > PIXELES_MAXIMOS) {
      throw new ApiError(
        errorCode.imageTooLarge,
        `Imagen demasiado grande: ${pixeles}px, máximo ${PIXELES_MAXIMOS}px`,
        [{ field: 'image', issue: `Píxeles ${pixeles} > ${PIXELES_MAXIMOS}` }],
      );
    }

    return { ancho, alto };
  }

  async function generarDerivados(
    buffer: Buffer,
    claveBase: string,
  ): Promise<DerivadosImagenResult> {
    const metadata = await sharp(buffer).metadata();
    const anchoOriginal = metadata.width ?? 0;
    const altoOriginal = metadata.height ?? 0;

    const derivados: DerivadoImagenProcesado[] = [];

    for (const anchoObjetivo of DERIVADOS_ANCHOS) {
      // No generar derivado más grande que la original
      if (anchoObjetivo > anchoOriginal) continue;

      const altoObjetivo = Math.round(anchoObjetivo * (altoOriginal / anchoOriginal));
      const clave = `${claveBase}-${anchoObjetivo}.webp`;
      const bufferDerivado = await sharp(buffer)
        .resize(anchoObjetivo)
        .webp({ quality: 85, effort: 4 })
        .toBuffer();

      derivados.push({ clave, ancho: anchoObjetivo, alto: altoObjetivo, buffer: bufferDerivado });
    }

    // Siempre incluir el derivado completo (tamaño original en WebP)
    if (!derivados.some((d) => d.ancho === anchoOriginal)) {
      const claveCompleta = `${claveBase}-full.webp`;
      const bufferCompleto = await sharp(buffer).webp({ quality: 85, effort: 4 }).toBuffer();

      derivados.push({
        clave: claveCompleta,
        ancho: anchoOriginal,
        alto: altoOriginal,
        buffer: bufferCompleto,
      });
    }

    return { derivados };
  }

  return {
    validarImagen,
    generarDerivados,
  };
}
