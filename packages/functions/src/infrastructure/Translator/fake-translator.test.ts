// FakeTranslator error mode tests (5.2)

import { afterEach, describe, expect, it, vi } from 'vitest';

const originalMode = process.env.TRANSLATOR_FAKE_MODE;

afterEach(() => {
  process.env.TRANSLATOR_FAKE_MODE = originalMode;
  vi.resetModules();
});

async function importFakeTranslator() {
  vi.resetModules();
  const mod = await import('./fake-translator.js');
  return mod.FakeTranslator;
}

describe('FakeTranslator — TRANSLATOR_FAKE_MODE=error (5.2)', () => {
  it('simula fallo total: hasErrors=true, outputs vacíos', async () => {
    process.env.TRANSLATOR_FAKE_MODE = 'error';
    const FakeTranslator = await importFakeTranslator();
    const translator = new FakeTranslator();

    const result = await translator.translate([
      { fieldPath: 'titulo', text: 'Casa en venta' },
      { fieldPath: 'descripcion', text: 'Bonita casa' },
    ]);

    expect(result.hasErrors).toBe(true);
    expect(result.outputs).toEqual([]);
    expect(result.error).toBe('simulated translation failure');
  });

  it('modo normal sigue funcionando cuando TRANSLATOR_FAKE_MODE no es error', async () => {
    process.env.TRANSLATOR_FAKE_MODE = undefined;
    const FakeTranslator = await importFakeTranslator();
    const translator = new FakeTranslator();

    const result = await translator.translate([
      { fieldPath: 'titulo', text: 'Casa en venta' },
      { fieldPath: 'descripcion', text: '' },
    ]);

    expect(result.hasErrors).toBe(false);
    expect(result.outputs).toEqual([
      { fieldPath: 'titulo', translated: 'Casa en venta (EN)' },
      { fieldPath: 'descripcion', translated: '' },
    ]);
  });

  it('lote vacío → salida vacía incluso en modo error', async () => {
    process.env.TRANSLATOR_FAKE_MODE = 'error';
    const FakeTranslator = await importFakeTranslator();
    const translator = new FakeTranslator();

    const result = await translator.translate([]);
    expect(result).toEqual({ outputs: [], hasErrors: false });
  });
});
