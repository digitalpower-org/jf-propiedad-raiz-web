import type { SecretComparator } from '../../application/ports/secret-comparator';
import { safeEqual } from './safe-equal';

export function createSecretComparator(): SecretComparator {
  return { equals: safeEqual };
}
