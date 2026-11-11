/**
 * Puerto Translator (US0.5, AC0.5.8)
 *
 * Interfaz para traducción de contenido ES→EN selectiva por campo.
 * El proveedor se oculta detrás de este puerto:
 * - Google Cloud Translation en producción.
 * - Traductor falso en desarrollo/pruebas/seed (AC0.5.9).
 *
 * Ningún módulo fuera de infraestructura importa el SDK del proveedor.
 */

/**
 * Entrada de traducción: un texto en español y su ruta de campo.
 * `fieldPath` permite contexto (p. ej. "titulo", "descripcion", "proyecto.etapa").
 */
export interface TranslationInput {
  readonly fieldPath: string;
  readonly text: string;
}

/**
 * Salida de traducción: la ruta de campo y su texto traducido.
 * Si el texto original era vacío, `translated` === "".
 */
export interface TranslationOutput {
  readonly fieldPath: string;
  readonly translated: string;
}

/**
 * Resultado de la operación de traducción.
 */
export interface TranslateResult {
  /** Traducciones para cada entrada válida (preserva orden). */
  readonly outputs: readonly TranslationOutput[];
  /** true si alguna entrada produjo error (no aborta el lote). */
  readonly hasErrors: boolean;
  /** Mensaje de error si falló algo (AC0.5.5). */
  readonly error?: string;
}

/**
 * Configuración del puerto Translator.
 */
export interface TranslatorConfig {
  readonly timeoutMs: number; // default 10_000 ms (AC0.5.5)
}

/**
 * Contrato del puerto Translator (AC0.5.8).
 *
 * Short-circuit (Corrección C):
 * 1. Si `inputs` está vacío → retorna inmediatamente con outputs=[] sin invocar SDK.
 * 2. Si un `text` individual es "" → su `translated` es "" también, sin invocar SDK.
 *
 * El proveedor real solo invoca el SDK con los textos no vacíos.
 */
export interface Translator {
  /**
   * Traduce un lote de textos ES→EN.
   * @param inputs entradas (cada una con fieldPath y text en español)
   * @returns resultados preservando el orden de `inputs`
   */
  readonly translate: (inputs: readonly TranslationInput[]) => Promise<TranslateResult>;
}
