import { describe, it, expect } from 'vitest';
import * as fs from 'fs';

describe('AuthProvider (US5.4 / AC5.4.7 — PROVISIONAL)', () => {
  it('archivo creado y marcado PROVISIONAL', () => {
    const path = './packages/client/src/app/[locale]/AuthProvider.tsx';
    const src = fs.readFileSync(path, 'utf8');
    expect(src).toContain('PROVISIONAL');
    expect(src).toContain('onIdTokenChanged');
    expect(src).toContain('renewSession');
  });
});
