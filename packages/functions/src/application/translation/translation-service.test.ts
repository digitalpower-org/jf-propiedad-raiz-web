import { describe, expect, it, vi } from 'vitest';

import { createFakeTranslator } from '../../infrastructure/Translator/fake-translator';
import { TranslationService } from './translation-service';
import { NoopLogger } from '../../infrastructure/logging/logger';

describe('TranslationService (US0.5)', () => {
  const makeDeps = (translatorOverride?: {
    translate: (
      inputs: readonly { fieldPath: string; text: string }[],
    ) => Promise<{
      outputs: { fieldPath: string; translated: string }[];
      hasErrors: boolean;
      error?: string;
    }>;
  }) => {
    const translator = translatorOverride ?? createFakeTranslator();
    const logger = new NoopLogger();
    return new TranslationService({ translator, logger });
  };

  describe('short-circuit', () => {
    it('empty batch returns empty outputs immediately', async () => {
      const service = makeDeps();
      const result = await service.translateContent([]);
      expect(result).toEqual({ outputs: [], hasErrors: false });
    });

    it('batch with only empty texts returns empty translations', async () => {
      const service = makeDeps();
      const inputs = [
        { fieldPath: 'title', text: '' },
        { fieldPath: 'description', text: '' },
      ];
      const result = await service.translateContent(inputs);
      expect(result).toEqual({
        outputs: [
          { fieldPath: 'title', translated: '' },
          { fieldPath: 'description', translated: '' },
        ],
        hasErrors: false,
      });
    });
  });

  describe('translation', () => {
    it('translates non-empty texts', async () => {
      const service = makeDeps();
      const inputs = [
        { fieldPath: 'title', text: 'Casa en venta' },
        { fieldPath: 'description', text: 'Bonita casa con jardín' },
      ];
      const result = await service.translateContent(inputs);
      expect(result.hasErrors).toBe(false);
      expect(result.outputs).toHaveLength(2);
      expect(result.outputs[0]).toEqual({ fieldPath: 'title', translated: 'Casa en venta (EN)' });
      expect(result.outputs[1]).toEqual({
        fieldPath: 'description',
        translated: 'Bonita casa con jardín (EN)',
      });
    });

    it('preserves order of inputs', async () => {
      const service = makeDeps();
      const inputs = [
        { fieldPath: 'a', text: 'primero' },
        { fieldPath: 'b', text: 'segundo' },
        { fieldPath: 'c', text: 'tercero' },
      ];
      const result = await service.translateContent(inputs);
      expect(result.outputs.map((o) => o.fieldPath)).toEqual(['a', 'b', 'c']);
    });

    it('handles mix of empty and non-empty texts', async () => {
      const service = makeDeps();
      const inputs = [
        { fieldPath: 'title', text: 'Título' },
        { fieldPath: 'description', text: '' },
        { fieldPath: 'subtitle', text: 'Subtítulo' },
      ];
      const result = await service.translateContent(inputs);
      expect(result.outputs).toEqual([
        { fieldPath: 'title', translated: 'Título (EN)' },
        { fieldPath: 'description', translated: '' },
        { fieldPath: 'subtitle', translated: 'Subtítulo (EN)' },
      ]);
    });
  });

  describe('retry logic', () => {
    it('retries once on failure and succeeds', async () => {
      let callCount = 0;
      const translator = {
        translate: vi.fn(async (inputs: readonly { fieldPath: string; text: string }[]) => {
          callCount++;
          if (callCount === 1) {
            return { outputs: [], hasErrors: true, error: 'timeout' };
          }
          return {
            outputs: inputs.map((i) => ({ fieldPath: i.fieldPath, translated: `${i.text} (EN)` })),
            hasErrors: false,
          };
        }),
      };
      const service = makeDeps(translator);
      const inputs = [{ fieldPath: 'title', text: 'Test' }];
      const result = await service.translateContent(inputs);
      expect(callCount).toBe(2);
      expect(result.hasErrors).toBe(false);
      expect(result.outputs[0]).toBeDefined();
      expect(result.outputs[0]!.translated).toBe('Test (EN)');
    });

    it('propagates error after retry fails', async () => {
      const translator = {
        translate: vi.fn(async () => ({
          outputs: [],
          hasErrors: true,
          error: 'persistent error',
        })),
      };
      const service = makeDeps(translator);
      const inputs = [{ fieldPath: 'title', text: 'Test' }];
      const result = await service.translateContent(inputs);
      expect(result.hasErrors).toBe(true);
      expect(result.error).toBe('persistent error');
    });
  });
});
