/**
 * Comprueba la paridad entre el catálogo **runtime** de códigos de error
 * (`packages/shared-types/errors.json`) y su unión de tipos
 * (`packages/shared-types/src/errors.d.ts`), exigida por AC0.1.3:
 * «la compilación falla si las dos divergen».
 *
 * La comprobación de **claves** también es de tipo (`src/errors.sync.d.ts`);
 * aquí se verifican los **estados HTTP**, que no se pueden expresar con tipos
 * (TypeScript amplía los números de un módulo JSON a `number`).
 *
 * Uso: `npm run check:errors -w @jf/shared-types`.
 * Sale con código 1 e imprime el diff si hay cualquier divergencia.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RUNTIME_CATALOG_PATH = join(PACKAGE_ROOT, "errors.json");
const TYPE_CATALOG_PATH = join(PACKAGE_ROOT, "src", "errors.d.ts");

/** Extrae los códigos declarados en `export type ErrorCode = ...`. */
function readUnionCodes(source) {
  const match = source.match(/export type ErrorCode\s*=\s*([\s\S]*?);/);
  if (!match) {
    throw new Error(`No se encontró 'export type ErrorCode' en ${TYPE_CATALOG_PATH}`);
  }
  return [...match[1].matchAll(/"([A-Z0-9_]+)"/g)].map((entry) => entry[1]);
}

/** Extrae la tabla código → estado de `export interface ErrorCodeTable { ... }`. */
function readStatusTable(source) {
  const match = source.match(/export interface ErrorCodeTable\s*\{([\s\S]*?)\n\}/);
  if (!match) {
    throw new Error(`No se encontró 'export interface ErrorCodeTable' en ${TYPE_CATALOG_PATH}`);
  }
  const table = new Map();
  for (const entry of match[1].matchAll(/readonly\s+([A-Z0-9_]+)\s*:\s*(\d+)\s*;/g)) {
    table.set(entry[1], Number(entry[2]));
  }
  return table;
}

/** Compara dos conjuntos de códigos y devuelve los códigos que sobran o faltan. */
function diffCodes(left, right) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return {
    onlyInLeft: [...leftSet].filter((code) => !rightSet.has(code)).sort(),
    onlyInRight: [...rightSet].filter((code) => !leftSet.has(code)).sort(),
  };
}

function main() {
  const runtimeCatalog = JSON.parse(readFileSync(RUNTIME_CATALOG_PATH, "utf8"));
  const typeSource = readFileSync(TYPE_CATALOG_PATH, "utf8");
  const unionCodes = readUnionCodes(typeSource);
  const statusTable = readStatusTable(typeSource);

  const problems = [];

  // 1. Los códigos del runtime deben ser los mismos que los de la unión de tipos.
  const runtimeCodes = Object.keys(runtimeCatalog);
  const codeDiff = diffCodes(runtimeCodes, unionCodes);
  if (codeDiff.onlyInLeft.length > 0) {
    problems.push(
      `Códigos solo en errors.json (ausentes en src/errors.d.ts): ${codeDiff.onlyInLeft.join(", ")}`,
    );
  }
  if (codeDiff.onlyInRight.length > 0) {
    problems.push(
      `Códigos solo en src/errors.d.ts (ausentes en errors.json): ${codeDiff.onlyInRight.join(", ")}`,
    );
  }

  // 2. Cada código debe tener su estado en la tabla de tipos.
  for (const code of runtimeCodes) {
    if (!statusTable.has(code)) {
      problems.push(`Falta el estado HTTP de '${code}' en 'ErrorCodeTable' (src/errors.d.ts)`);
    }
  }

  // 3. Los estados deben coincidir y ser códigos HTTP de error válidos.
  for (const [code, status] of Object.entries(runtimeCatalog)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(code)) {
      problems.push(`'${code}' no sigue la convención de códigos (MAYUSCULAS_CON_GUION_BAJO)`);
    }
    if (!Number.isInteger(status) || status < 400 || status > 599) {
      problems.push(`'${code}' declara el estado ${status}, que no es un HTTP de error válido`);
    }
    const declared = statusTable.get(code);
    if (declared !== undefined && declared !== status) {
      problems.push(
        `Estado divergente para '${code}': errors.json dice ${status} y src/errors.d.ts dice ${declared}`,
      );
    }
  }

  if (problems.length > 0) {
    console.error("✖ Catálogo de errores divergente (AC0.1.3):");
    for (const problem of problems) {
      console.error(`  - ${problem}`);
    }
    console.error(
      "  Corrige errors.json y src/errors.d.ts para que declaren los mismos códigos y estados.",
    );
    process.exit(1);
  }

  console.log(
    `✔ Catálogo de errores en paridad: ${runtimeCodes.length} códigos (errors.json ≡ src/errors.d.ts).`,
  );
}

main();
