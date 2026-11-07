import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { parseRole } from './role';

describe('parseRole', () => {
  it('acepta el rol admin', () => {
    expect(parseRole('admin')).toBe('admin');
  });

  it('rechaza roles fuera del catálogo', () => {
    expect(() => parseRole('editor')).toThrow(ZodError);
  });

  it('rechaza valores que no son texto', () => {
    expect(() => parseRole(1)).toThrow(ZodError);
  });
});
