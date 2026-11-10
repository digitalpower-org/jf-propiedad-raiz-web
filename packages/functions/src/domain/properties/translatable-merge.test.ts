// mergeTranslatable tests (5.3)
// Una prueba por rama + batch con varios campos donde uno falla.

import { describe, expect, it } from 'vitest';
import { mergeTranslatable } from './translatable-merge';

const existing = {
  es: 'Casa en venta',
  en: 'House for sale',
  autoTranslate: true,
  enPendiente: false,
} as const;

const translateOk = async (text: string) => `${text} (EN)`;
const translateFail = async () => {
  throw new Error('simulated translation failure');
};

describe('mergeTranslatable — rama 1: input.en presente y distinto (AC0.5.12)', () => {
  it('persiste el en enviado por el admin sin traducir, enPendiente=false', async () => {
    const result = await mergeTranslatable(
      existing,
      { es: 'Casa en venta', en: 'Custom English', autoTranslate: true },
      true,
      translateOk,
    );
    expect(result.en).toBe('Custom English');
    expect(result.enPendiente).toBe(false);
    expect(result.status).toBe('Actualizada');
    expect(result.autoTranslate).toBe(true);
  });
});

describe('mergeTranslatable — rama 2: es cambió + autoTranslate activo (AC0.5.11)', () => {
  it('éxito → en=translated, enPendiente=false', async () => {
    const result = await mergeTranslatable(
      existing,
      { es: 'Casa nueva', autoTranslate: true },
      true,
      translateOk,
    );
    expect(result.en).toBe('Casa nueva (EN)');
    expect(result.enPendiente).toBe(false);
    expect(result.status).toBe('Actualizada');
  });

  it('fallo → conservar en anterior, enPendiente=true', async () => {
    const result = await mergeTranslatable(
      existing,
      { es: 'Casa nueva', autoTranslate: true },
      true,
      translateFail,
    );
    expect(result.en).toBe('House for sale');
    expect(result.enPendiente).toBe(true);
    expect(result.status).toBe('Pendiente');
  });
});

describe('mergeTranslatable — rama 3: es cambió + autoTranslate inactivo (AC0.5.11)', () => {
  it('conserva en anterior, enPendiente=true', async () => {
    const result = await mergeTranslatable(
      existing,
      { es: 'Casa nueva', autoTranslate: false },
      false,
      translateOk,
    );
    expect(result.en).toBe('House for sale');
    expect(result.enPendiente).toBe(true);
    expect(result.status).toBe('Pendiente');
    expect(result.autoTranslate).toBe(false);
  });
});

describe('mergeTranslatable — rama 4: campo nuevo + autoTranslate activo', () => {
  const nuevo = { es: '', autoTranslate: true, enPendiente: false } as const;

  it('éxito → en=translated, enPendiente=false', async () => {
    const result = await mergeTranslatable(
      nuevo,
      { es: 'Nuevo inmueble', autoTranslate: true },
      true,
      translateOk,
    );
    expect(result.en).toBe('Nuevo inmueble (EN)');
    expect(result.enPendiente).toBe(false);
    expect(result.status).toBe('Actualizada');
  });

  it('fallo → en="", enPendiente=true', async () => {
    const result = await mergeTranslatable(
      nuevo,
      { es: 'Nuevo inmueble', autoTranslate: true },
      true,
      translateFail,
    );
    expect(result.en).toBe('');
    expect(result.enPendiente).toBe(true);
    expect(result.status).toBe('Pendiente');
  });
});

describe('mergeTranslatable — rama 5: es no cambió → no traducir (AC0.5.12)', () => {
  it('mantiene el en anterior sin llamar al traductor', async () => {
    let called = false;
    const translate = async () => {
      called = true;
      return 'should not be called';
    };

    const result = await mergeTranslatable(
      existing,
      { es: 'Casa en venta', autoTranslate: true },
      true,
      translate,
    );

    expect(called).toBe(false);
    expect(result.en).toBe('House for sale');
    expect(result.enPendiente).toBe(false);
    expect(result.status).toBe('Actualizada');
  });

  it('si en anterior vacío y enPendiente true → queda Pendiente', async () => {
    const result = await mergeTranslatable(
      { es: 'Casa en venta', en: '', autoTranslate: true, enPendiente: true },
      { es: 'Casa en venta', autoTranslate: true },
      true,
      translateOk,
    );
    expect(result.en).toBe('');
    expect(result.enPendiente).toBe(true);
    expect(result.status).toBe('Pendiente');
  });
});

describe('mergeTranslatable — batch: varios campos donde uno falla', () => {
  it('mezcla de ramas con un campo que falla', async () => {
    const inputs = [
      {
        existing: { es: 'Título', en: 'Title', autoTranslate: true, enPendiente: false },
        input: { es: 'Título', autoTranslate: true },
        autoTranslate: true,
      },
      {
        existing: { es: 'Desc', autoTranslate: true, enPendiente: true },
        input: { es: 'Nueva desc', autoTranslate: true },
        autoTranslate: true,
      },
      {
        existing: { es: 'Pisos', en: 'Floors', autoTranslate: false, enPendiente: false },
        input: { es: 'Pisos nuevos', autoTranslate: false },
        autoTranslate: false,
      },
    ];

    const results = await Promise.all(
      inputs.map(({ existing, input, autoTranslate }) =>
        mergeTranslatable(existing, input, autoTranslate, translateFail),
      ),
    );

    // título: es no cambió → no traducir, en se mantiene
    const r0 = results[0]!;
    expect(r0.en).toBe('Title');
    expect(r0.status).toBe('Actualizada');

    // descripcion: es cambió + autoTranslate activo + fallo → en undefined, Pendiente
    const r1 = results[1]!;
    expect(r1.en).toBeUndefined();
    expect(r1.enPendiente).toBe(true);
    expect(r1.status).toBe('Pendiente');

    // acabados: es cambió + autoTranslate inactivo → conservar en, Pendiente
    const r2 = results[2]!;
    expect(r2.en).toBe('Floors');
    expect(r2.enPendiente).toBe(true);
    expect(r2.status).toBe('Pendiente');
  });
});
