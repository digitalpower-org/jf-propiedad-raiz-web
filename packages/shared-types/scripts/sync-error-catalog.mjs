/**
 * Sincroniza `packages/shared-types/src/errors.d.ts` desde
 * `packages/shared-types/errors.json` (fuente runtime del catálogo de errores).
 *
 * No editar `errors.d.ts` a mano: este archivo se regenera con este script.
 * Uso: `npm run sync:errors -w @jf/shared-types`
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_PATH = join(ROOT, 'errors.json');
const TS_PATH = join(ROOT, 'src', 'errors.d.ts');

const catalog = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
const codes = Object.keys(catalog);

// Validar convenciones antes de escribir
for (const code of codes) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(code)) {
    throw new Error(`'${code}' no sigue la convención MAYUSCULAS_CON_GUION_BAJO`);
  }
  const status = catalog[code];
  if (!Number.isInteger(status) || status < 400 || status > 599) {
    throw new Error(`'${code}' declara estado ${status}, no es un código HTTP de error válido`);
  }
}

// Este script es dueño SOLO de la unión `ErrorCode` y de la interfaz
// `ErrorCodeTable`. El resto de `errors.d.ts` (envolturas `ApiSuccess`/`ApiFailure`,
// `ApiErrorData`, `ErrorCodeStatus`…) es código escrito a mano y debe conservarse.

const unionLines = codes.map((code) => `    | "${code}"`);
unionLines[unionLines.length - 1] += ';';

const unionBlock = `export type ErrorCode =\n${unionLines.join('\n')}\n`;

const tableBlock = `export interface ErrorCodeTable {\n${codes
  .map((code) => `    readonly ${code}: ${catalog[code]};`)
  .join('\n')}\n}\n`;

const UNION_RE = /export type ErrorCode =\n(?:[ \t]*\|[^\n]*\n)+(?:[ \t]*;\n)?/;
const TABLE_RE = /export interface ErrorCodeTable \{\n(?:[^\n]*\n)*?\}\n/;

const DEFAULT_HEADER = `/**
 * Auto-generado por scripts/sync-error-catalog.mjs. No editar manualmente.
 *
 * Catálogo único de códigos de error y envolturas de respuesta (AC0.1.1–AC0.1.3, D15).
 * Misma tabla que \`docs/openapi.backend.yaml\` y \`docs/openapi.bff.yaml\` (\`ErrorCode\`).
 */

`;

let current = '';
try {
  current = readFileSync(TS_PATH, 'utf8');
} catch {
  // Archivo no existe aún; se creará con el encabezado por defecto.
}

let content;
if (current === '') {
  content = `${DEFAULT_HEADER}/** Códigos de error estándar (AC0.1.3). */\n${unionBlock}\n/** Tabla código → estado HTTP (AC0.1.3). */\n${tableBlock}`;
} else {
  if (!UNION_RE.test(current) || !TABLE_RE.test(current)) {
    throw new Error(
      `${TS_PATH} no contiene los bloques generados esperados; revisa si se editó a mano antes de sobrescribirlo`,
    );
  }
  content = current
    .replace(UNION_RE, () => unionBlock)
    .replace(TABLE_RE, () => tableBlock);
}

if (current !== content) {
  writeFileSync(TS_PATH, content);
  console.log(`✔ ${TS_PATH} actualizado desde ${JSON_PATH}`);
} else {
  console.log(`✔ ${TS_PATH} ya está sincronizado`);
}
