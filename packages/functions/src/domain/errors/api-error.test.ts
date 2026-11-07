import { describe, expect, it } from 'vitest';

import { ApiError } from './api-error';

describe('ApiError', () => {
  it('expone código, mensaje y detalles', () => {
    const error = new ApiError('VALIDATION_ERROR', 'Datos inválidos', { field: 'slug' });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Datos inválidos');
    expect(error.details).toEqual({ field: 'slug' });
  });

  it('omite la propiedad details cuando no se proporciona', () => {
    const error = new ApiError('NOT_FOUND', 'No encontrado');

    expect('details' in error).toBe(false);
  });
});
