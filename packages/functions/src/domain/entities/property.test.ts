import { describe, expect, it } from 'vitest';

import type { CreatePropertyInput } from './property';
import { Property } from './property';
import { parsePrecio, type Precio } from '../value-objects/precio';

const ahora = new Date('2026-01-15T10:00:00Z');

const inputValido: CreatePropertyInput = {
  operacion: 'VENTA',
  tipo: 'CASA',
  titulo: { es: 'Casa en venta', en: 'House for sale' },
  precio: parsePrecio(150000000),
  departamento: 'Antioquia',
  municipio: 'Medellín',
  fotos: [{ derivados: [] }],
};

describe('Property.create', () => {
  it('crea inmueble en estado HIDDEN', () => {
    const propiedad = Property.create(inputValido, 'doc-1', 'JF-0001', ahora);

    expect(propiedad.status).toBe('HIDDEN');
    expect(propiedad.id).toBe('doc-1');
    expect(propiedad.codigo).toBe('JF-0001');
    expect(propiedad.slug).toBe('casa-en-venta-jf-0001');
    expect(propiedad.createdAt).toBe('2026-01-15T10:00:00.000Z');
    expect(propiedad.updatedAt).toBe('2026-01-15T10:00:00.000Z');
    expect(propiedad.fechaPublicacion).toBeUndefined();
  });

  it('lanza error si título en español está vacío', () => {
    const input = { ...inputValido, titulo: { es: '' } };

    expect(() => Property.create(input, 'doc-1', 'JF-0001', ahora)).toThrow(
      'El título en español es obligatorio',
    );
  });

  it('genera slug minúsculas con guiones', () => {
    const propiedad = Property.create(
      { ...inputValido, titulo: { es: 'Casa Bonita en Venta' } },
      'doc-2',
      'JF-0002',
      ahora,
    );

    expect(propiedad.slug).toBe('casa-bonita-en-venta-jf-0002');
  });
});

describe('Property.update', () => {
  it('actualiza campos y refresca updatedAt', () => {
    const propiedad = Property.create(inputValido, 'doc-1', 'JF-0001', ahora);
    const ahoraMasTarde = new Date('2026-01-16T10:00:00Z');

    const actualizada = propiedad.update(
      { precio: parsePrecio(200000000), departamento: 'Bogotá' },
      ahoraMasTarde,
    );

    expect(actualizada.id).toBe(propiedad.id);
    expect(actualizada.precio).toBe(200000000);
    expect(actualizada.departamento).toBe('Bogotá');
    expect(actualizada.updatedAt).toBe('2026-01-16T10:00:00.000Z');
    // campos no enviados se mantienen
    expect(actualizada.operacion).toBe('VENTA');
    expect(actualizada.tipo).toBe('CASA');
    expect(actualizada.createdAt).toBe(propiedad.createdAt);
  });
});

describe('Property.activate', () => {
  it('activa inmueble HIDDEN y fija fechaPublicacion', () => {
    const propiedad = Property.create(inputValido, 'doc-1', 'JF-0001', ahora);

    const resultado = propiedad.activate(ahora);

    expect(resultado.property.status).toBe('ACTIVE');
    expect(resultado.firstActivation).toBe(true);
    expect(resultado.fechaPublicacion).toBe('2026-01-15T10:00:00.000Z');
    expect(resultado.property.fechaPublicacion).toBe('2026-01-15T10:00:00.000Z');
  });

  it('no cambia fechaPublicacion en segunda activación', () => {
    const propiedad = Property.create(inputValido, 'doc-1', 'JF-0001', ahora);
    const primera = propiedad.activate(ahora);
    const ahoraMasTarde = new Date('2026-01-16T10:00:00Z');

    expect(() => primera.property.activate(ahoraMasTarde)).toThrow('El inmueble ya está activo');
  });

  it('lanza error si ya está ACTIVE', () => {
    const propiedad = Property.create(inputValido, 'doc-1', 'JF-0001', ahora);
    const activada = propiedad.activate(ahora);

    expect(() => activada.property.activate(ahora)).toThrow('El inmueble ya está activo');
  });

  it('lanza error si faltan campos obligatorios', () => {
    const propiedad = Property.create(
      { ...inputValido, departamento: '', municipio: '', precio: 0 as unknown as Precio },
      'doc-1',
      'JF-0001',
      ahora,
    );

    expect(() => propiedad.activate(ahora)).toThrow('Campos obligatorios para activar');
  });
});

describe('Property.hide', () => {
  it('oculta inmueble ACTIVE sin cambiar fechaPublicacion', () => {
    const propiedad = Property.create(inputValido, 'doc-1', 'JF-0001', ahora);
    const activada = propiedad.activate(ahora);
    const ahoraMasTarde = new Date('2026-01-16T10:00:00Z');

    const ocultada = activada.property.hide(ahoraMasTarde);

    expect(ocultada.status).toBe('HIDDEN');
    expect(ocultada.fechaPublicacion).toBe('2026-01-15T10:00:00.000Z');
  });

  it('lanza error si ya está HIDDEN', () => {
    const propiedad = Property.create(inputValido, 'doc-1', 'JF-0001', ahora);

    expect(() => propiedad.hide(ahora)).toThrow('El inmueble ya está oculto');
  });
});

describe('Property.softDelete', () => {
  it('soft delete inmueble ACTIVE', () => {
    const propiedad = Property.create(inputValido, 'doc-1', 'JF-0001', ahora);
    const activada = propiedad.activate(ahora);

    const eliminada = activada.property.softDelete(ahora);

    expect(eliminada.status).toBe('DELETED');
  });

  it('lanza error si ya está DELETED', () => {
    const propiedad = Property.create(inputValido, 'doc-1', 'JF-0001', ahora);
    const activada = propiedad.activate(ahora);
    const eliminada = activada.property.softDelete(ahora);

    expect(() => eliminada.softDelete(ahora)).toThrow('El inmueble ya está eliminado');
  });
});
