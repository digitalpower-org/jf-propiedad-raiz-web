import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TranslationInput } from './translator';

const { translateMock, TranslateMock } = vi.hoisted(() => {
  const translateMock = vi.fn();
  const TranslateMock = vi.fn(function (this: { translate: typeof translateMock }) {
    this.translate = translateMock;
  });
  return { translateMock, TranslateMock };
});

vi.mock('@google-cloud/translate', () => ({
  v2: {
    Translate: TranslateMock,
  },
}));

import {
  GoogleCloudTranslator,
  createGoogleCloudTranslator,
} from './google-cloud-translator';

type TranslateCall = [string[], { from: string; to: string }];

function firstCall(): TranslateCall {
  return translateMock.mock.calls[0] as TranslateCall;
}

describe('GoogleCloudTranslator (US0.5, AC0.5.8)', () => {
  beforeEach(() => {
    translateMock.mockReset();
    TranslateMock.mockClear();
  });

  describe('constructor and factory', () => {
    it('constructs the SDK client without a projectId by default', () => {
      new GoogleCloudTranslator();
      expect(TranslateMock).toHaveBeenCalledTimes(1);
      expect(TranslateMock).toHaveBeenCalledWith();
    });

    it('passes projectId and keeps a custom timeout', () => {
      new GoogleCloudTranslator({ projectId: 'jf-project', timeoutMs: 2_500 });
      expect(TranslateMock).toHaveBeenCalledWith({ projectId: 'jf-project' });
    });

    it('createGoogleCloudTranslator returns a usable Translator', async () => {
      translateMock.mockResolvedValue([['Casa']]);
      const translator = createGoogleCloudTranslator({ projectId: 'jf-project' });

      const result = await translator.translate([{ fieldPath: 'titulo', text: 'Casa' }]);

      expect(result).toEqual({
        outputs: [{ fieldPath: 'titulo', translated: 'Casa' }],
        hasErrors: false,
      });
    });
  });

  describe('short-circuits', () => {
    it('returns no outputs for an undefined batch without calling the SDK', async () => {
      const translator = new GoogleCloudTranslator();

      const result = await translator.translate(
        undefined as unknown as readonly TranslationInput[],
      );

      expect(result).toEqual({ outputs: [], hasErrors: false });
      expect(translateMock).not.toHaveBeenCalled();
    });

    it('returns no outputs for an empty batch without calling the SDK', async () => {
      const translator = new GoogleCloudTranslator();

      const result = await translator.translate([]);

      expect(result).toEqual({ outputs: [], hasErrors: false });
      expect(translateMock).not.toHaveBeenCalled();
    });

    it('maps empty texts to empty translations without calling the SDK', async () => {
      const translator = new GoogleCloudTranslator();

      const result = await translator.translate([
        { fieldPath: 'titulo', text: '' },
        { fieldPath: 'descripcion', text: '' },
      ]);

      expect(result).toEqual({
        outputs: [
          { fieldPath: 'titulo', translated: '' },
          { fieldPath: 'descripcion', translated: '' },
        ],
        hasErrors: false,
      });
      expect(translateMock).not.toHaveBeenCalled();
    });
  });

  describe('successful translations', () => {
    it('translates a single field and sends the expected request shape', async () => {
      translateMock.mockResolvedValue([['House for sale']]);
      const translator = new GoogleCloudTranslator();

      const result = await translator.translate([
        { fieldPath: 'titulo', text: 'Casa en venta' },
      ]);

      expect(translateMock).toHaveBeenCalledTimes(1);
      const [texts, options] = firstCall();
      expect(texts).toEqual(['Casa en venta']);
      expect(options).toEqual({ from: 'es', to: 'en' });
      expect(result).toEqual({
        outputs: [{ fieldPath: 'titulo', translated: 'House for sale' }],
        hasErrors: false,
      });
    });

    it('translates a batch, skips empty texts, and preserves input order', async () => {
      translateMock.mockResolvedValue([['Title', 'Description']]);
      const translator = new GoogleCloudTranslator();

      const result = await translator.translate([
        { fieldPath: 'titulo', text: 'Título' },
        { fieldPath: 'vacio', text: '' },
        { fieldPath: 'descripcion', text: 'Descripción' },
      ]);

      const [texts] = firstCall();
      expect(texts).toEqual(['Título', 'Descripción']);
      expect(result.outputs).toEqual([
        { fieldPath: 'titulo', translated: 'Title' },
        { fieldPath: 'vacio', translated: '' },
        { fieldPath: 'descripcion', translated: 'Description' },
      ]);
      expect(result.hasErrors).toBe(false);
    });

    it('accepts a single string response from the SDK', async () => {
      translateMock.mockResolvedValue(['House']);
      const translator = new GoogleCloudTranslator();

      const result = await translator.translate([{ fieldPath: 'titulo', text: 'Casa' }]);

      expect(result.outputs).toEqual([{ fieldPath: 'titulo', translated: 'House' }]);
      expect(result.hasErrors).toBe(false);
    });

    it('fires the configured timeout while the SDK is still pending', async () => {
      vi.useFakeTimers();
      let resolveTranslate!: (value: unknown) => void;
      translateMock.mockImplementation(
        () =>
          new Promise<unknown>((resolve) => {
            resolveTranslate = resolve;
          }),
      );

      try {
        const translator = new GoogleCloudTranslator({ timeoutMs: 50 });
        const pending = translator.translate([{ fieldPath: 'titulo', text: 'Casa' }]);

        await vi.advanceTimersByTimeAsync(50);
        resolveTranslate([['House']]);

        await expect(pending).resolves.toEqual({
          outputs: [{ fieldPath: 'titulo', translated: 'House' }],
          hasErrors: false,
        });
      } finally {
        vi.useRealTimers();
      }
    });

    it('leaves fields empty when the SDK returns fewer translations than inputs', async () => {
      translateMock.mockResolvedValue([['Only first']]);
      const translator = new GoogleCloudTranslator();

      const result = await translator.translate([
        { fieldPath: 'titulo', text: 'Uno' },
        { fieldPath: 'descripcion', text: 'Dos' },
      ]);

      expect(result.outputs).toEqual([
        { fieldPath: 'titulo', translated: 'Only first' },
        { fieldPath: 'descripcion', translated: '' },
      ]);
      expect(result.hasErrors).toBe(false);
    });
  });

  describe('error handling', () => {
    it('propagates an SDK Error as hasErrors with its message', async () => {
      translateMock.mockRejectedValue(new Error('api unavailable'));
      const translator = new GoogleCloudTranslator();

      const result = await translator.translate([
        { fieldPath: 'titulo', text: 'Casa' },
        { fieldPath: 'descripcion', text: 'Descripción' },
      ]);

      expect(result.hasErrors).toBe(true);
      expect(result.error).toBe('api unavailable');
      expect(result.outputs).toEqual([
        { fieldPath: 'titulo', translated: '' },
        { fieldPath: 'descripcion', translated: '' },
      ]);
    });

    it('stringifies a non-Error rejection', async () => {
      translateMock.mockRejectedValue('network down');
      const translator = new GoogleCloudTranslator();

      const result = await translator.translate([{ fieldPath: 'titulo', text: 'Casa' }]);

      expect(result.hasErrors).toBe(true);
      expect(result.error).toBe('network down');
    });

    it('reports an unexpected response shape as an error', async () => {
      translateMock.mockResolvedValue([{ unexpected: true }]);
      const translator = new GoogleCloudTranslator();

      const result = await translator.translate([{ fieldPath: 'titulo', text: 'Casa' }]);

      expect(result.hasErrors).toBe(true);
      expect(result.error).toBe('Respuesta inesperada de Google Cloud Translation');
      expect(result.outputs).toEqual([{ fieldPath: 'titulo', translated: '' }]);
    });
  });
});
