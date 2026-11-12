import { describe, expect, it, vi } from 'vitest';

import { buildHandlers } from './index';
import type { UseCases } from '../../application/buildUseCases';
import type { AsyncHandler } from './types';

const useCases = {
  verifyInternalSession: { execute: vi.fn() },
  crearProperty: { execute: vi.fn() },
  actualizarProperty: { execute: vi.fn() },
  eliminarProperty: { execute: vi.fn() },
  activarProperty: { execute: vi.fn() },
  ocultarProperty: { execute: vi.fn() },
  listarProperties: { execute: vi.fn() },
  obtenerProperty: { execute: vi.fn() },
  presignMediaUpload: { execute: vi.fn() },
  confirmarMediaUpload: { execute: vi.fn() },
} as unknown as UseCases;

describe('buildHandlers', () => {
  it('construye todos los handlers con los use cases inyectados', () => {
    const handlers = buildHandlers(useCases);

    expect(handlers.verifyInternalSession).toBeInstanceOf(Function);
    expect(handlers.health).toBeInstanceOf(Function);
    expect(handlers.createProperty).toBeInstanceOf(Function);
    expect(handlers.updateProperty).toBeInstanceOf(Function);
    expect(handlers.deleteProperty).toBeInstanceOf(Function);
    expect(handlers.activateProperty).toBeInstanceOf(Function);
    expect(handlers.hideProperty).toBeInstanceOf(Function);
    expect(handlers.listProperties).toBeInstanceOf(Function);
    expect(handlers.obtenerProperty).toBeInstanceOf(Function);
    expect(handlers.presignMediaUpload).toBeInstanceOf(Function);
    expect(handlers.confirmarMediaUpload).toBeInstanceOf(Function);
  });

  it('retorna handlers que son funciones async válidas', () => {
    const handlers = buildHandlers(useCases);

    const asyncHandlers: AsyncHandler[] = [
      handlers.verifyInternalSession,
      handlers.createProperty,
      handlers.updateProperty,
      handlers.deleteProperty,
      handlers.activateProperty,
      handlers.hideProperty,
      handlers.listProperties,
      handlers.obtenerProperty,
      handlers.presignMediaUpload,
      handlers.confirmarMediaUpload,
    ];

    for (const handler of asyncHandlers) {
      expect(handler.constructor.name).toBe('AsyncFunction');
    }

    expect(handlers.health).toBeInstanceOf(Function);
  });
});
