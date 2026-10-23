#!/usr/bin/env node
/**
 * Presupuesto de bytes del cliente (AC7.2.2, `docs/PERFORMANCE.md` §3).
 *
 * Mide lo que el navegador descarga para hidratar una ruta ya construida:
 * los <script> y <link rel="stylesheet"> que aparecen en el HTML prerenderizado,
 * comprimidos con gzip. Es la medición reproducible sin navegador; el total de
 * página completo (imágenes y fuentes incluidas) se mide con Lighthouse.
 *
 * Uso:
 *   npm run analyze:bundle                 # /es y /en
 *   npm run analyze:bundle -- --route=es   # una sola ruta
 *   npm run analyze:bundle -- --enforce    # falla si se supera el presupuesto
 *
 * Informativo por defecto hasta MT6.2; `--enforce` lo vuelve bloqueante.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const CLIENT_DIR = resolve(import.meta.dirname, '..', 'packages', 'client');
const NEXT_DIR = join(CLIENT_DIR, '.next');

const DEFAULT_ROUTES = ['es', 'en'];
const DEFAULT_JS_BUDGET_KB = 200;

const argv = process.argv.slice(2);

function option(name, fallback) {
  const prefix = `--${name}=`;
  const found = argv.find((argument) => argument.startsWith(prefix));
  return found === undefined ? fallback : found.slice(prefix.length);
}

const enforce = argv.includes('--enforce');
const routes = argv
  .filter((argument) => argument.startsWith('--route='))
  .map((argument) => argument.slice('--route='.length));
const selectedRoutes = routes.length > 0 ? routes : DEFAULT_ROUTES;
const budgetKb = Number.parseFloat(option('budget-kb', String(DEFAULT_JS_BUDGET_KB)));

function fail(message) {
  console.error(`analyze-bundle: ${message}`);
  process.exit(1);
}

if (!existsSync(NEXT_DIR)) {
  fail('no existe packages/client/.next; ejecuta antes `npm run build -w @jf/client`.');
}

if (!Number.isFinite(budgetKb) || budgetKb <= 0) {
  fail(`presupuesto inválido: ${option('budget-kb', '')}`);
}

const ASSET_PATTERN = /(?:src|href)="(\/_next\/[^"]+\.(?:js|css))"/g;

function assetsForRoute(route) {
  const htmlPath = join(NEXT_DIR, 'server', 'app', `${route}.html`);
  if (!existsSync(htmlPath)) {
    fail(`no existe ${htmlPath}. Rutas construidas: ${listBuiltRoutes().join(', ') || 'ninguna'}.`);
  }

  const html = readFileSync(htmlPath, 'utf8');
  const assets = new Set();
  for (const match of html.matchAll(ASSET_PATTERN)) {
    const asset = match[1];
    if (asset !== undefined) assets.add(asset);
  }

  return [...assets];
}

function listBuiltRoutes() {
  try {
    return readdirSync(join(NEXT_DIR, 'server', 'app'))
      .filter((file) => file.endsWith('.html') && file !== '_not-found.html')
      .map((file) => file.slice(0, -'.html'.length));
  } catch {
    return [];
  }
}

function compressedSize(asset) {
  const file = join(NEXT_DIR, asset.replace('/_next/', ''));
  if (!existsSync(file)) fail(`el HTML referencia ${asset}, pero no existe en .next.`);

  const buffer = readFileSync(file);
  return { raw: buffer.byteLength, gzip: gzipSync(buffer).byteLength };
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const rows = [];
let failed = false;

for (const route of selectedRoutes) {
  const assets = assetsForRoute(route);
  const js = assets.filter((asset) => asset.endsWith('.js'));
  const css = assets.filter((asset) => asset.endsWith('.css'));

  const jsGzip = js.reduce((total, asset) => total + compressedSize(asset).gzip, 0);
  const cssGzip = css.reduce((total, asset) => total + compressedSize(asset).gzip, 0);

  const overBudget = jsGzip > budgetKb * 1024;
  if (overBudget) failed = true;

  rows.push({
    route: `/${route}`,
    scripts: js.length,
    stylesheets: css.length,
    jsGzip,
    cssGzip,
    status: overBudget ? 'EXCEDE' : 'OK',
  });
}

const header = ['Ruta', 'JS (gzip)', 'CSS (gzip)', 'Archivos', `Presupuesto JS`, 'Estado'];
const table = rows.map((row) => [
  row.route,
  formatKb(row.jsGzip),
  formatKb(row.cssGzip),
  `${row.scripts} js / ${row.stylesheets} css`,
  `≤ ${budgetKb} KB`,
  row.status,
]);

const widths = header.map((cell, index) =>
  Math.max(cell.length, ...table.map((row) => row[index].length)),
);

function formatRow(cells) {
  return cells.map((cell, index) => cell.padEnd(widths[index])).join('  ');
}

console.log(formatRow(header));
console.log(widths.map((width) => '-'.repeat(width)).join('  '));
for (const row of table) console.log(formatRow(row));

if (failed) {
  const message = `presupuesto de JS inicial superado (${budgetKb} KB gzip, PERFORMANCE.md §3).`;
  if (enforce) fail(message);
  console.log(`\nAVISO: ${message} Informativo hasta MT6.2.`);
}
