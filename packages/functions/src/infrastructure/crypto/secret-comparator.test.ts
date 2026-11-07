import { describe, expect, it } from 'vitest';

import { createSecretComparator } from './secret-comparator';

describe('createSecretComparator', () => {
  it('acepta secretos idénticos', () => {
    expect(createSecretComparator().equals('super-secret', 'super-secret')).toBe(true);
  });

  it('rechaza secretos distintos', () => {
    expect(createSecretComparator().equals('super-secret', 'other-secret')).toBe(false);
  });

  it('rechaza longitudes distintas sin lanzar', () => {
    expect(createSecretComparator().equals('short', 'a-much-longer-secret')).toBe(false);
  });
});
