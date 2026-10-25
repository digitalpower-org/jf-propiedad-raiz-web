import { describe, expect, it } from 'vitest';

import { matchRoute } from './match-route';

describe('cierre de la superficie del BFF (AC0.1.6)', () => {
  it('reconoce una ruta declarada con su método', () => {
    const match = matchRoute('GET', '/api/properties');
    expect(match.kind).toBe('match');
    if (match.kind === 'match') expect(match.route.internalPath).toBe('/api/v1/properties');
  });

  it('no reconoce rutas fuera del catálogo', () => {
    expect(matchRoute('GET', '/api/no-existe')).toEqual({ kind: 'not-found' });
    expect(matchRoute('GET', '/api')).toEqual({ kind: 'not-found' });
    expect(matchRoute('GET', '/api/v1/properties')).toEqual({ kind: 'not-found' });
    expect(matchRoute('GET', '/internal/auth/verify')).toEqual({ kind: 'not-found' });
  });

  it('devuelve 405 con los métodos aceptados del patrón resuelto', () => {
    expect(matchRoute('PUT', '/api/properties')).toEqual({
      kind: 'method-not-allowed',
      allow: ['GET', 'POST'],
    });
  });

  it('el segmento literal gana al dinámico antes de mirar el método', () => {
    const literal = matchRoute('GET', '/api/properties/featured');
    expect(literal.kind).toBe('match');

    expect(matchRoute('PUT', '/api/properties/featured')).toEqual({
      kind: 'method-not-allowed',
      allow: ['GET'],
    });
  });

  it('usa el patrón dinámico cuando el literal no coincide', () => {
    const match = matchRoute('PUT', '/api/properties/casa-arboleda');
    expect(match.kind).toBe('match');
    if (match.kind === 'match') {
      expect(match.route.internalPath).toBe('/api/v1/properties/{idOrSlug}');
      expect(match.route.auth).toBe('session');
    }
  });

  it('acepta la barra final y descarta query y hash', () => {
    expect(matchRoute('GET', '/api/properties/').kind).toBe('match');
    expect(matchRoute('GET', '/api/properties?page=2').kind).toBe('match');
    expect(matchRoute('GET', '/api/properties#top').kind).toBe('match');
  });

  it('no permite HEAD sobre una ruta GET declarada', () => {
    expect(matchRoute('HEAD', '/api/properties')).toEqual({
      kind: 'method-not-allowed',
      allow: ['GET', 'POST'],
    });
  });
});
