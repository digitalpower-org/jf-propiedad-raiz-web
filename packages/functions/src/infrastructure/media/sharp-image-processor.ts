import sharp from 'sharp';

import type { ImageProcessor } from '../../application/ports/image-processor';
import type {
  DerivadoImagenProcesado,
  DerivadosImagenResult,
} from '../../application/ports/image-processor';

/**
 * Tamaños de derivados WebP (AGENTS.md §9): 320, 640, 1280, 2048 o tamaño completo.
 */
const DERIVADOS_ANCHOS = [320, 640, 1280, 2048] as const;

/** Lado mayor mínimo permitido (AC1.9.6, IMAGE_TOO_SMALL). */
const LADO_MAYOR_MINIMO = 800;

/** Tope de píxeles totales (ancho × alto) para evitar imágenes excesivas. */
const PIXELES_MAXIMOS = 50_000_000; // 50 MP

/**
 * Adaptador Sharp de `ImageProcessor`.
 *
 * Valida y transforma imágenes en memoria. No conoce Express, HTTP ni R2.
 */
export function createSharpImageProcessor(): ImageProcessor {
  async function validarImagen(
    buffer: Buffer,
    _mimeType: string,
  ): Promise<{ readonly ancho: number; readonly alto: number }> {
    const metadata = await sharp(buffer).metadata();

    const ancho = metadata.width ?? 0;
    const alto = metadata.height ?? 0;

    if (ancho === 0 || alto === 0) {
      throw new Error('Imagen sin dimensiones válidas');
    }

    const ladoMayor = Math.max(ancho, alto);

    if (ladoMayor < LADO_MAYOR_MINIMO) {
      throw new Error(
        `Imagen demasiado pequeña: lado mayor ${ladoMayor}px, mínimo ${LADO_MAYOR_MINIMO}px`,
      );
    }

    const pixeles = ancho * alto;
    if (pixeles > PIXELES_MAXIMOS) {
      throw new Error(
        `Imagen demasiado grande: ${pixeles}px, máximo ${PIXELES_MAXIMOS}px`,
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

    const derivados: DerivadoImagenProcesado[] = [];

    for (const anchoObjetivo of DERIVADOS_ANCHOS) {
      // No generar derivado más grande que la original
      if (anchoObjetivo > anchoOriginal) continue;

      const clave = `${claveBase}-${anchoObjetivo}.webp`;
      const bufferDerivado = await sharp(buffer)
        .resize(anchoObjetivo)
        .webp({ quality: 85, effort: 4 })
        .toBuffer();

      derivados.push({ clave, ancho: anchoObjetivo, buffer: bufferDerivado });
    }

    // Siempre incluir el derivado completo (tamaño original en WebP)
    if (!derivados.some((d) => d.ancho === anchoOriginal)) {
      const claveCompleta = `${claveBase}-full.webp`;
      const bufferCompleto = await sharp(buffer)
        .webp({ quality: 85, effort: 4 })
        .toBuffer();

      derivados.push({
        clave: claveCompleta,
        ancho: anchoOriginal,
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
