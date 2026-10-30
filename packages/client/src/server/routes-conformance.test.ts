/**
 * AC1.3.1 — Conformidad del catálogo: toda ruta que exige sesión (o clave
 * interna) pasa por el envoltorio `bffRoute()`; ninguna delega ni responde por
 * su cuenta. Se recorre `ROUTES`, no una lista manual.
 */

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { ROUTES } from './routes';

const API_DIR = path.resolve(process.cwd(), 'src/app/api');

function collectRouteFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectRouteFiles(full);
    return entry.name === 'route.ts' ? [full] : [];
  });
}

function apiPath(file: string): string {
  const segments = path
    .relative(API_DIR, path.dirname(file))
    .split(path.sep)
    .map((segment) => segment.replace(/^\[(\w+)\]$/, '{$1}'));
  return '/api/' + segments.join('/');
}

const FILES = new Map(collectRouteFiles(API_DIR).map((file) => [apiPath(file), file]));

describe('conformidad del catálogo con el envoltorio del BFF', () => {
  it('cada ruta declarada tiene su route.ts', () => {
    const missing = ROUTES.filter((route) => !FILES.has(route.path)).map((route) => route.path);
    expect(missing).toEqual([]);
  });

  it('toda ruta no pública o delegada pasa por bffRoute()', () => {
    const offenders: string[] = [];

    for (const route of ROUTES) {
      if (route.auth === 'public' && route.internalPath === null) continue;

      const file = FILES.get(route.path);
      if (!file) {
        offenders.push(`${route.method} ${route.path}: sin route.ts`);
        continue;
      }

      const source = fs.readFileSync(file, 'utf8');
      const wrapped = new RegExp(
        `export const ${route.method}\\s*=\\s*(bffRoute|handler)\\s*[(;]`,
      ).test(source);

      if (!wrapped) offenders.push(`${route.method} ${route.path}`);
    }

    expect(offenders).toEqual([]);
  });
});
