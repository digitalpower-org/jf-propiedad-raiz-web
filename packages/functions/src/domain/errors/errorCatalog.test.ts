import { describe, expect, it } from 'vitest';

import { ERROR_CODES } from './errorCatalog';

describe('ERROR_CODES', () => {
  it('contiene exactamente los 15 códigos del contrato', () => {
    expect(ERROR_CODES).toHaveLength(15);
    expect(new Set(ERROR_CODES).size).toBe(15);
  });

  it('incluye los códigos usados por autenticación y operación', () => {
    expect(ERROR_CODES).toContain('UNAUTHORIZED');
    expect(ERROR_CODES).toContain('PERMISSION_DENIED');
    expect(ERROR_CODES).toContain('VALIDATION_ERROR');
    expect(ERROR_CODES).toContain('METHOD_NOT_ALLOWED');
    expect(ERROR_CODES).toContain('INTERNAL');
  });
});
