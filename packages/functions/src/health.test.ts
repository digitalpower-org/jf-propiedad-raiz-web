import { describe, expect, it } from 'vitest';

import { HEALTH_OK, type HealthFailureCode } from './health';

describe('health de Functions (MT0.5)', () => {
  it('devuelve un cuerpo estable', () => {
    expect(HEALTH_OK).toEqual({ status: 'ok', service: 'functions' });
  });

  it('resuelve el código de error compartido en tiempo de compilación', () => {
    const code: HealthFailureCode = 'INTERNAL';
    expect(code).toBe('INTERNAL');
  });
});
