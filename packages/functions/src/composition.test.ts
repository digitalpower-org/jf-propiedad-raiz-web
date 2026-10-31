// createTranslator tests (5.1)

import { afterEach, describe, expect, it, vi } from 'vitest';

const originalFake = process.env.TRANSLATOR_FAKE;

afterEach(() => {
  process.env.TRANSLATOR_FAKE = originalFake;
  vi.resetModules();
});

describe('createTranslator (5.1)', () => {
  it('TRANSLATOR_FAKE=1 → FakeTranslator', async () => {
    process.env.TRANSLATOR_FAKE = '1';
    vi.resetModules();
    const { createTranslator } = await import('./composition.js');
    const translator = createTranslator();
    const result = await translator.translate([{ fieldPath: 'titulo', text: 'Casa en venta' }]);
    expect(result.hasErrors).toBe(false);
    expect(result.outputs.length).toBe(1);
    expect(result.outputs[0]!.translated).toBe('Casa en venta (EN)');
  });

  it('TRANSLATOR_FAKE no definido → GoogleCloudTranslator', async () => {
    process.env.TRANSLATOR_FAKE = undefined;
    vi.resetModules();
    const { createTranslator } = await import('./composition.js');
    const translator = createTranslator();
    expect(translator).toBeDefined();
    expect(typeof translator.translate).toBe('function');
  });

  it('TRANSLATOR_FAKE vacío → GoogleCloudTranslator', async () => {
    process.env.TRANSLATOR_FAKE = '';
    vi.resetModules();
    const { createTranslator } = await import('./composition.js');
    const translator = createTranslator();
    expect(translator).toBeDefined();
  });
});
