import { describe, expect, it, vi } from 'vitest';

import type {
  ActualizarPropertyInputDto,
  CrearPropertyInputDto,
  PropertyDto,
} from '../ports/properties-repository';
import type { Logger } from '../ports/logger';
import type { Translator } from '../ports/translator';
import type { TranslatableFieldResult } from './property-translations';
import { TranslationService } from './translation-service';
import { translatePropertyFields } from './property-translations';
import { NoopLogger } from '../../infrastructure/logging/noop-logger';

function makeService(translate: Translator['translate']): TranslationService {
  return new TranslationService({ translator: { translate }, logger: new NoopLogger() });
}

function makeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

const baseInput: CrearPropertyInputDto = {
  operacion: 'VENTA',
  tipo: 'CASA',
  titulo: { es: 'Casa en venta' },
  precio: 150000000,
  departamento: 'Antioquia',
  municipio: 'Medellín',
};

const existingProperty: PropertyDto = {
  id: 'doc-1',
  codigo: 'JF-0001',
  slug: 'casa-en-venta',
  status: 'ACTIVE',
  operacion: 'VENTA',
  tipo: 'CASA',
  titulo: { es: 'Casa en venta', en: 'House for sale' },
  precio: 150000000,
  departamento: 'Antioquia',
  municipio: 'Medellín',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  destacada: false,
};

describe('translatePropertyFields (US0.5)', () => {
  it('no traduce cuando no hay campos traducibles', async () => {
    const translate = vi.fn();
    const logger = makeLogger();
    const input: ActualizarPropertyInputDto = { precio: 200000000 };

    const resultado = await translatePropertyFields(
      input,
      undefined,
      { translationService: makeService(translate), logger },
      'req-1',
    );

    expect(translate).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    expect(resultado).toEqual(input);
  });

  it('no traduce cuando es no cambió y en ya existe (control de costo, AC0.5.2)', async () => {
    const translate = vi.fn();
    const logger = makeLogger();
    const input: CrearPropertyInputDto = {
      ...baseInput,
      titulo: { es: 'Casa en venta', en: 'House for sale', autoTranslate: true },
    };

    const resultado = await translatePropertyFields(
      input,
      existingProperty,
      { translationService: makeService(translate), logger },
      'req-1',
    );

    expect(translate).not.toHaveBeenCalled();
    const titulo = resultado.titulo! as TranslatableFieldResult;
    expect(titulo.en).toBe('House for sale');
    expect(titulo.enPendiente).toBe(false);
  });

  it('traduce todos los campos candidatos en un único lote', async () => {
    const translate = vi.fn().mockResolvedValue({
      outputs: [
        { fieldPath: 'titulo', translated: 'House for sale (EN)' },
        { fieldPath: 'descripcion', translated: 'Beautiful house (EN)' },
      ],
      hasErrors: false,
    });
    const logger = makeLogger();
    const input: CrearPropertyInputDto = {
      ...baseInput,
      titulo: { es: 'Casa en venta' },
      descripcion: { es: 'Bonita casa' },
    };

    const resultado = await translatePropertyFields(
      input,
      undefined,
      { translationService: makeService(translate), logger },
      'req-1',
    );

    expect(translate).toHaveBeenCalledTimes(1);
    expect(translate).toHaveBeenCalledWith([
      { fieldPath: 'titulo', text: 'Casa en venta' },
      { fieldPath: 'descripcion', text: 'Bonita casa' },
    ]);
    const titulo = resultado.titulo! as TranslatableFieldResult;
    expect(titulo.en).toBe('House for sale (EN)');
    const desc = resultado.descripcion! as TranslatableFieldResult;
    expect(desc.en).toBe('Beautiful house (EN)');
  });

  it('es vacío → en vacío sin traducir (AC0.5.3)', async () => {
    const translate = vi.fn();
    const logger = makeLogger();
    const input: CrearPropertyInputDto = {
      ...baseInput,
      titulo: { es: '' },
    };

    const resultado = await translatePropertyFields(
      input,
      undefined,
      { translationService: makeService(translate), logger },
      'req-1',
    );

    expect(translate).not.toHaveBeenCalled();
    const titulo = resultado.titulo! as TranslatableFieldResult;
    expect(titulo.en).toBe('');
    expect(titulo.enPendiente).toBe(false);
  });

  it('en manual no vacío se preserva sin traducir (AC0.5.4)', async () => {
    const translate = vi.fn();
    const logger = makeLogger();
    const input: CrearPropertyInputDto = {
      ...baseInput,
      titulo: { es: 'Casa en venta', en: 'Manual translation' },
    };

    const resultado = await translatePropertyFields(
      input,
      undefined,
      { translationService: makeService(translate), logger },
      'req-1',
    );

    expect(translate).not.toHaveBeenCalled();
    const titulo = resultado.titulo! as TranslatableFieldResult;
    expect(titulo.en).toBe('Manual translation');
    expect(titulo.enPendiente).toBe(false);
  });

  it('autoTranslate inactivo conserva en anterior y enPendiente=true (AC0.5.11)', async () => {
    const translate = vi.fn();
    const logger = makeLogger();
    const input: CrearPropertyInputDto = {
      ...baseInput,
      titulo: { es: 'Casa modificada', autoTranslate: false },
    };

    const resultado = await translatePropertyFields(
      input,
      existingProperty,
      { translationService: makeService(translate), logger },
      'req-1',
    );

    expect(translate).not.toHaveBeenCalled();
    const titulo = resultado.titulo! as TranslatableFieldResult;
    expect(titulo.en).toBe('House for sale');
    expect(titulo.enPendiente).toBe(true);
  });

  it('hasErrors loguea translation_failed y campos quedan en "" / enPendiente=true (AC0.5.5)', async () => {
    const translate = vi.fn().mockResolvedValue({
      outputs: [],
      hasErrors: true,
      error: 'timeout',
    });
    const logger = makeLogger();
    const input: CrearPropertyInputDto = {
      ...baseInput,
      titulo: { es: 'Casa nueva' },
    };

    const resultado = await translatePropertyFields(
      input,
      undefined,
      { translationService: makeService(translate), logger },
      'req-1',
    );

    expect(logger.error).toHaveBeenCalledWith('translation_failed', 'timeout', {
      requestId: 'req-1',
      fieldPaths: ['titulo'],
    });
    const titulo = resultado.titulo! as TranslatableFieldResult;
    expect(titulo.en).toBe('');
    expect(titulo.enPendiente).toBe(true);
  });

  it('translator que lanza loguea translation_failed y campos quedan en "" / enPendiente=true', async () => {
    const translate = vi.fn().mockRejectedValue(new Error('service down'));
    const logger = makeLogger();
    const input: CrearPropertyInputDto = {
      ...baseInput,
      titulo: { es: 'Casa nueva' },
    };

    const resultado = await translatePropertyFields(
      input,
      undefined,
      { translationService: makeService(translate), logger },
      'req-1',
    );

    expect(logger.error).toHaveBeenCalledWith('translation_failed', expect.any(Error), {
      requestId: 'req-1',
      fieldPaths: ['titulo'],
    });
    const titulo = resultado.titulo! as TranslatableFieldResult;
    expect(titulo.en).toBe('');
    expect(titulo.enPendiente).toBe(true);
  });

  it('puntosInteres[<i>].etiqueta se traduce con ruta de campo correcta', async () => {
    const translate = vi.fn().mockResolvedValue({
      outputs: [{ fieldPath: 'puntosInteres[0].etiqueta', translated: 'Park (EN)' }],
      hasErrors: false,
    });
    const logger = makeLogger();
    const input: CrearPropertyInputDto = {
      ...baseInput,
      puntosInteres: [{ categoria: 'ZONA_COMERCIAL', etiqueta: { es: 'Parque' } }],
    };

    const resultado = await translatePropertyFields(
      input,
      undefined,
      { translationService: makeService(translate), logger },
      'req-1',
    );

    expect(translate).toHaveBeenCalledWith([
      { fieldPath: 'titulo', text: 'Casa en venta' },
      { fieldPath: 'puntosInteres[0].etiqueta', text: 'Parque' },
    ]);
    const puntos = resultado.puntosInteres!;
    const etiqueta = puntos[0].etiqueta!;
    expect(etiqueta.en).toBe('Park (EN)');
    expect(etiqueta.enPendiente).toBe(false);
  });

  it('proyecto.etapa se traduce con ruta de campo correcta', async () => {
    const translate = vi.fn().mockResolvedValue({
      outputs: [{ fieldPath: 'proyecto.etapa', translated: 'Stage 1 (EN)' }],
      hasErrors: false,
    });
    const logger = makeLogger();
    const input: CrearPropertyInputDto = {
      ...baseInput,
      proyecto: { etapa: { es: 'Etapa 1' } },
    };

    const resultado = await translatePropertyFields(
      input,
      undefined,
      { translationService: makeService(translate), logger },
      'req-1',
    );

    expect(translate).toHaveBeenCalledWith([
      { fieldPath: 'titulo', text: 'Casa en venta' },
      { fieldPath: 'proyecto.etapa', text: 'Etapa 1' },
    ]);
    const etapa = resultado.proyecto!.etapa!;
    expect(etapa.en).toBe('Stage 1 (EN)');
  });

  it('actualización con existente: es cambiado se traduce', async () => {
    const translate = vi.fn().mockResolvedValue({
      outputs: [{ fieldPath: 'titulo', translated: 'Modified house (EN)' }],
      hasErrors: false,
    });
    const logger = makeLogger();
    const input: ActualizarPropertyInputDto = {
      titulo: { es: 'Casa modificada' },
    };

    const resultado = await translatePropertyFields(
      input,
      existingProperty,
      { translationService: makeService(translate), logger },
      'req-1',
    );

    expect(translate).toHaveBeenCalledWith([{ fieldPath: 'titulo', text: 'Casa modificada' }]);
    const titulo = resultado.titulo! as TranslatableFieldResult;
    expect(titulo.en).toBe('Modified house (EN)');
  });
});
