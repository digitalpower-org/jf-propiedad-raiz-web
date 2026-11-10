/**
 * Comparación de secretos en tiempo constante. La implementación concreta
 * (Node `crypto.timingSafeEqual`) se inyecta desde Infrastructure.
 */
export interface SecretComparator {
  equals(a: string, b: string): boolean;
}
