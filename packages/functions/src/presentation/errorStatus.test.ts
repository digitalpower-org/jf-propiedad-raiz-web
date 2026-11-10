import { describe, expect, it } from 'vitest';

import { ERROR_CODES } from '../domain/errors/errorCatalog';
import { STATUS_BY_CODE } from './errorStatus';

describe('STATUS_BY_CODE', () => {
  it('mapea cada código de error del contrato', () => {
    expect(Object.keys(STATUS_BY_CODE).sort()).toEqual([...ERROR_CODES].sort());
  });

  it('incluye el estado 405 no presente en el contrato', () => {
    expect(STATUS_BY_CODE.METHOD_NOT_ALLOWED).toBe(405);
  });

  it('asigna los estados HTTP esperados a los códigos de autenticación', () => {
    expect(STATUS_BY_CODE.UNAUTHORIZED).toBe(401);
    expect(STATUS_BY_CODE.PERMISSION_DENIED).toBe(403);
    expect(STATUS_BY_CODE.VALIDATION_ERROR).toBe(422);
    expect(STATUS_BY_CODE.INTERNAL).toBe(500);
  });
});
