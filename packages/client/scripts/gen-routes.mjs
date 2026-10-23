#!/usr/bin/env node
// Genera packages/client/src/server/routes.ts desde docs/openapi.bff.yaml.
// Uso: node scripts/gen-routes.mjs [--check]
//   --check  no escribe; sale con 1 si el fichero generado esta obsoleto.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const BFF_SPEC = path.join(REPO_ROOT, 'docs/openapi.bff.yaml');
const BACKEND_SPEC = path.join(REPO_ROOT, 'docs/openapi.backend.yaml');
const OUT_FILE = path.join(REPO_ROOT, 'packages/client/src/server/routes.ts');
const CHECK = process.argv.includes('--check');

const require = createRequire(path.join(REPO_ROOT, 'package.json'));
const yaml = require('js-yaml');
const prettier = require('prettier');

const METHODS = ['get', 'put', 'post', 'delete', 'patch', 'head', 'options', 'trace'];
const AUTH_SCHEMES = { session: 'session', 'X-Internal-Key': 'internal' };

const errors = [];

function fail(messages, exitCode = 1) {
  console.error('gen:routes — no se puede generar el catalogo:');
  for (const message of messages) console.error(`  ✗ ${message}`);
  process.exit(exitCode);
}

function loadSpec(file) {
  const rel = path.relative(REPO_ROOT, file);
  try {
    return yaml.load(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return fail([`${rel}: ${error.message}`]);
  }
}

function resolveAuth(op, where) {
  const hasOwn = Object.prototype.hasOwnProperty.call(op, 'security');
  const security = hasOwn ? op.security : globalSecurity;
  if (security !== undefined && !Array.isArray(security)) {
    errors.push(`${where}: 'security' no es una lista`);
    return 'public';
  }
  const schemes = [...new Set((security ?? []).flatMap((alt) => Object.keys(alt ?? {})))];
  if (schemes.length === 0) return 'public';
  const auth = AUTH_SCHEMES[schemes[0]];
  if (!auth || schemes.length > 1) {
    errors.push(`${where}: esquema de seguridad no soportado (${schemes.join(', ')})`);
    return 'public';
  }
  return auth;
}

function resolveInternalPath(op, publicPath) {
  if (Object.prototype.hasOwnProperty.call(op, 'x-bff-internal-path')) {
    return op['x-bff-internal-path'];
  }
  return publicPath.replace(/^\/api\//, '/api/v1/');
}

const bff = loadSpec(BFF_SPEC);
const backend = loadSpec(BACKEND_SPEC);
const globalSecurity = Array.isArray(bff.security) ? bff.security : [];

const backendOps = new Set();
for (const [backendPath, item] of Object.entries(backend.paths ?? {})) {
  for (const method of METHODS) {
    if (item?.[method]) backendOps.add(`${method.toUpperCase()} ${backendPath}`);
  }
}

const rows = [];
for (const [publicPath, item] of Object.entries(bff.paths ?? {})) {
  if (!item || typeof item !== 'object') continue;
  if (!publicPath.startsWith('/api/')) {
    errors.push(`${publicPath}: la superficie publica debe empezar por /api/`);
  }
  for (const method of METHODS) {
    const op = item[method];
    if (!op) continue;

    const where = `${method.toUpperCase()} ${publicPath}`;
    const auth = resolveAuth(op, where);
    const internalPath = resolveInternalPath(op, publicPath);

    if (internalPath !== null && typeof internalPath !== 'string') {
      errors.push(`${where}: x-bff-internal-path debe ser texto o null`);
      continue;
    }
    if (typeof internalPath === 'string') {
      if (!/^\/(api\/v1|internal)\//.test(internalPath)) {
        errors.push(`${where}: destino fuera de /api/v1/ o /internal/ -> ${internalPath}`);
      }
      if (!backendOps.has(`${method.toUpperCase()} ${internalPath}`)) {
        errors.push(`${where}: destino inexistente en el contrato interno -> ${internalPath}`);
      }
    }
    rows.push({ method: method.toUpperCase(), path: publicPath, auth, internalPath });
  }
}

const forwarded = rows.filter((row) => row.internalPath !== null);
const reached = new Set(forwarded.map((row) => `${row.method} ${row.internalPath}`));
for (const backendOp of backendOps) {
  if (!reached.has(backendOp)) {
    errors.push(`operacion interna sin origen publico -> ${backendOp}`);
  }
}

if (errors.length > 0) fail(errors);

const literal = (value) => (value === null ? 'null' : `'${value}'`);
const entries = rows
  .map(
    (row) =>
      `  { method: '${row.method}', path: '${row.path}', auth: '${row.auth}', internalPath: ${literal(row.internalPath)} },`,
  )
  .join('\n');

const source = `// GENERADO por scripts/gen-routes.mjs — NO EDITAR A MANO.
// Fuente: docs/openapi.bff.yaml
export type RouteAuth = 'public' | 'session' | 'internal';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'TRACE';

export interface BffRoute {
  readonly method: HttpMethod;
  readonly path: string;
  readonly auth: RouteAuth;
  /** null = la ruta se resuelve en el BFF y no se reenvia al backend */
  readonly internalPath: string | null;
}

export const ROUTES = [
${entries}
] as const satisfies readonly BffRoute[];
`;

const prettierConfig = (await prettier.resolveConfig(OUT_FILE)) ?? {};
const output = await prettier.format(source, { ...prettierConfig, filepath: OUT_FILE });

const current = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : null;
const byAuth = rows.reduce((acc, row) => {
  acc[row.auth] = (acc[row.auth] ?? 0) + 1;
  return acc;
}, {});
const summary = `${rows.length} rutas (${Object.entries(byAuth)
  .map(([auth, total]) => `${total} ${auth}`)
  .join(', ')}); ${forwarded.length} reenviadas, ${rows.length - forwarded.length} locales`;

if (CHECK) {
  if (current !== output) {
    console.error('gen:routes — packages/client/src/server/routes.ts esta obsoleto.');
    console.error('  Ejecuta: npm run gen:routes -w @jf/client');
    process.exit(1);
  }
  console.log(`gen:routes — al dia: ${summary}`);
  process.exit(0);
}

if (current === output) {
  console.log(`gen:routes — sin cambios: ${summary}`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, output);
console.log(`gen:routes — escrito packages/client/src/server/routes.ts: ${summary}`);
