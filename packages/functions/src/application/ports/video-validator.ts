/**
 * Puerto de validación de videos de YouTube.
 *
 * La infraestructura (YouTube oEmbed) implementa este puerto. La capa de
 * aplicación no conoce detalles del proveedor ni del transporte HTTP.
 */

export interface VideoValidator {
  /**
   * Valida que una URL de YouTube sea válida y exista.
   *
   * @param url - URL de YouTube a validar.
   * @throws Cuando la URL no es válida o el video no existe.
   */
  validate(url: string): Promise<void>;
}
