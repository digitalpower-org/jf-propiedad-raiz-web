import { describe, expect, it } from 'vitest';

import {
  R2_PREFIX_PENDING,
  R2_PREFIX_DERIVADOS,
  R2_PRESIGN_EXPIRES_SECONDS,
  R2_MIME_WEBP,
  R2_MIME_JPEG,
} from './constants';

describe('R2 media constants', () => {
  it('expone las constantes esperadas', () => {
    expect(R2_PREFIX_PENDING).toBe('pending/');
    expect(R2_PREFIX_DERIVADOS).toBe('derivados/');
    expect(R2_PRESIGN_EXPIRES_SECONDS).toBe(900);
    expect(R2_MIME_WEBP).toBe('image/webp');
    expect(R2_MIME_JPEG).toBe('image/jpeg');
  });
});
