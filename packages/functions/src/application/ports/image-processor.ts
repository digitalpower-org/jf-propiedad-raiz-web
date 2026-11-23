/**
 * Resultado del procesamiento de una imagen: derivados WebP con sus buffers listos para persistir.
 */
export interface DerivadoImagenProcesado {
  readonly clave: string;
  readonly ancho: number;
  readonly alto: number;
  readonly buffer: Buffer;
}

/**
 * Resultado del procesamiento de una imagen.
 */
export interface DerivadosImagenResult {
  readonly derivados: readonly DerivadoImagenProcesado[];
}

/**
 * Puerto de procesamiento de imágenes (US1.9).
 * Implementado por Sharp.
 *
 * No conoce Express, HTTP ni R2: solo valida y transforma imágenes en memoria.
 * Lanza ApiError con códigos específicos para fallos de validación esperados:
 * - UNSUPPORTED_MEDIA: tipo MIME no soportado
 * - IMAGE_TOO_LARGE: peso o píxeles exceden límites
 * - IMAGE_TOO_SMALL: lado mayor menor a 800px
 * - VALIDATION_ERROR: imagen sin dimensiones válidas, panorámica sin proporción 2:1
 */
export interface ImageProcessor {
  /**
   * Valida una imagen subida: tipo de contenido, peso, dimensiones mínimas,
   * tope de píxeles y proporción. Lanza ApiError si no pasa alguna validación.
   */
  readonly validarImagen: (
    buffer: Buffer,
    mimeType: string,
  ) => Promise<{ readonly ancho: number; readonly alto: number }>;

  /**
   * Genera derivados WebP de una imagen en los tamaños estándar
   * (320, 640, 1280, 2048 o tamaño completo). Devuelve los buffers listos
   * para persistir.
   */
  readonly generarDerivados: (buffer: Buffer, claveBase: string) => Promise<DerivadosImagenResult>;
}
