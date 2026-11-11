#!/usr/bin/env node
/**
 * measure-bytes.mjs
 * Script de análisis de bundles (MT0.4) — mide bytes transferidos por ruta
 * Compara contra presupuestos de PERFORMANCE.md §3
 * Modo informativo: no bloquea CI hasta MT6.2
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const CLIENT_DIR = path.join(ROOT, 'packages/client');
const BUILD_DIR = path.join(CLIENT_DIR, '.next');
const OUTPUT_DIR = path.join(ROOT, 'docs/reports');

// Presupuestos de PERFORMANCE.md §3
const BUDGETS = {
  // JS hidratado de la primera carga de un listado
  'list-page-js': { max: 200 * 1024, label: 'JS hidratado listado (gz)' },
  // Total de una página de listado (HTML + CSS + JS + fuentes)
  'list-page-total': { max: 1024 * 1024, label: 'Total listado (gz)' },
  // Total de una ficha hasta ser interactiva
  'detail-page-total': { max: 1.5 * 1024 * 1024, label: 'Total ficha (gz)' },
  // JSON de una página de 12 tarjetas
  'list-json': { max: 30 * 1024, label: 'JSON listado 12 tarjetas (raw)' },
  // Bundle de idioma servido
  'locale-bundle': { max: 50 * 1024, label: 'Bundle idioma (gz)' },
};

function runCmd(cmd, cwd = CLIENT_DIR) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch (e) {
    console.error(`Error running: ${cmd}`);
    console.error(e.message);
    return '';
  }
}

function getGzipSize(filepath) {
  try {
    const content = fs.readFileSync(filepath);
    const gzip = execSync(`gzip -c`, { input: content, encoding: 'buffer' });
    return gzip.length;
  } catch {
    return 0;
  }
}

function getRawSize(filepath) {
  try {
    return fs.statSync(filepath).size;
  } catch {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function analyzeBundles() {
  console.log('📦 Analizando bundles...\n');

  // Verificar que existe el build
  if (!fs.existsSync(BUILD_DIR)) {
    console.error('❌ No existe .next/ — ejecuta `npm run build` primero');
    process.exit(1);
  }

  const results = {};

  // 1. Analizar chunks JS por página (listado, ficha, home)
  const serverDir = path.join(BUILD_DIR, 'server');
  const chunksDir = path.join(BUILD_DIR, 'static', 'chunks');

  // Buscar archivos de páginas principales
  const pagePaths = [
    { key: 'home', pattern: /pages\/\[locale\]\/page/ },
    { key: 'venta', pattern: /pages\/\[locale\]\/venta/ },
    { key: 'alquiler', pattern: /pages\/\[locale\]\/alquiler/ },
    { key: 'proyectos', pattern: /pages\/\[locale\]\/proyectos/ },
    { key: 'propiedad', pattern: /pages\/\[locale\]\/propiedad/ },
    { key: 'aviso-de-privacidad', pattern: /pages\/\[locale\]\/aviso-de-privacidad/ },
    {
      key: 'politica-de-tratamiento-de-datos',
      pattern: /pages\/\[locale\]\/politica-de-tratamiento-de-datos/,
    },
    { key: 'terminos', pattern: /pages\/\[locale\]\/terminos/ },
  ];

  for (const { key, pattern } of pagePaths) {
    // Buscar el chunk JS de la página
    const chunkFiles = fs
      .readdirSync(chunksDir)
      .filter((f) => f.endsWith('.js') && pattern.test(f));
    let totalJs = 0;
    let totalJsGzip = 0;

    for (const chunk of chunkFiles) {
      const filepath = path.join(chunksDir, chunk);
      const raw = getRawSize(filepath);
      const gzip = getGzipSize(filepath);
      totalJs += raw;
      totalJsGzip += gzip;
    }

    results[key] = {
      jsRaw: totalJs,
      jsGzip: totalJsGzip,
      jsRawFmt: formatBytes(totalJs),
      jsGzipFmt: formatBytes(totalJsGzip),
    };
  }

  // 2. Analizar CSS
  const cssDir = path.join(BUILD_DIR, 'static', 'css');
  if (fs.existsSync(cssDir)) {
    const cssFiles = fs.readdirSync(cssDir).filter((f) => f.endsWith('.css'));
    let totalCss = 0;
    let totalCssGzip = 0;
    for (const css of cssFiles) {
      const filepath = path.join(cssDir, css);
      totalCss += getRawSize(filepath);
      totalCssGzip += getGzipSize(filepath);
    }
    results.css = {
      raw: totalCss,
      gzip: totalCssGzip,
      rawFmt: formatBytes(totalCss),
      gzipFmt: formatBytes(totalCssGzip),
    };
  }

  // 3. Fuentes
  const fontDir = path.join(BUILD_DIR, 'static', 'media');
  if (fs.existsSync(fontDir)) {
    const fontFiles = fs.readdirSync(fontDir).filter((f) => /\.(woff2|woff|ttf)$/.test(f));
    let totalFonts = 0;
    let totalFontsGzip = 0;
    for (const font of fontFiles) {
      const filepath = path.join(fontDir, font);
      totalFonts += getRawSize(filepath);
      totalFontsGzip += getGzipSize(filepath);
    }
    results.fonts = {
      raw: totalFonts,
      gzip: totalFontsGzip,
      rawFmt: formatBytes(totalFonts),
      gzipFmt: formatBytes(totalFontsGzip),
    };
  }

  // 4. JSON de listado (simulado - endpoint API)
  // En build time no hay API real, pero podemos estimar desde el tamaño de los chunks
  results['list-json-estimated'] = { note: 'Requiere endpoint API real; estimado desde chunks' };

  // Imprimir resultados
  console.log('=== RESULTADOS DE BUNDLES ===\n');

  for (const [key, data] of Object.entries(results)) {
    if (key === 'css' || key === 'fonts') {
      console.log(`${key.toUpperCase()}:`);
      console.log(`  Raw: ${data.rawFmt} | Gzip: ${data.gzipFmt}`);
    } else if (typeof data === 'object' && data.jsGzip !== undefined) {
      console.log(`${key}:`);
      console.log(`  JS Raw: ${data.jsRawFmt} | JS Gzip: ${data.jsGzipFmt}`);
    }
  }

  // Comparar contra presupuestos
  console.log('\n=== PRESUPUESTOS (PERFORMANCE.md §3) ===\n');

  const budgetChecks = [
    {
      key: 'venta',
      budget: BUDGETS['list-page-js'],
      value: results.venta?.jsGzip || 0,
      label: 'JS hidratado /es/venta',
    },
    {
      key: 'alquiler',
      budget: BUDGETS['list-page-js'],
      value: results.alquiler?.jsGzip || 0,
      label: 'JS hidratado /es/alquiler',
    },
    {
      key: 'proyectos',
      budget: BUDGETS['list-page-js'],
      value: results.proyectos?.jsGzip || 0,
      label: 'JS hidratado /es/proyectos',
    },
    {
      key: 'propiedad',
      budget: BUDGETS['detail-page-total'],
      value:
        (results.propiedad?.jsGzip || 0) + (results.css?.gzip || 0) + (results.fonts?.gzip || 0),
      label: 'Total ficha /es/propiedad',
    },
    {
      key: 'home',
      budget: BUDGETS['list-page-total'],
      value: (results.home?.jsGzip || 0) + (results.css?.gzip || 0) + (results.fonts?.gzip || 0),
      label: 'Total home /es',
    },
  ];

  let allPass = true;
  for (const check of budgetChecks) {
    const status = check.value <= check.budget.max ? '✅ PASS' : '❌ FAIL';
    if (status === '❌ FAIL') allPass = false;
    console.log(
      `${status} ${check.label}: ${formatBytes(check.value)} / ${formatBytes(check.budget.max)} (${((check.value / check.budget.max) * 100).toFixed(1)}%)`,
    );
  }

  // Guardar reporte JSON
  const report = {
    timestamp: new Date().toISOString(),
    budgets: BUDGETS,
    results,
    budgetChecks: budgetChecks.map((c) => ({
      label: c.label,
      value: c.value,
      valueFmt: formatBytes(c.value),
      budget: c.budget.max,
      budgetFmt: formatBytes(c.budget.max),
      pass: c.value <= c.budget.max,
    })),
    allPass,
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, 'bundle-analysis.json'), JSON.stringify(report, null, 2));
  console.log(`\n📄 Reporte guardado en ${path.join(OUTPUT_DIR, 'bundle-analysis.json')}`);

  return allPass ? 0 : 1;
}

// Main
const exitCode = analyzeBundles();
process.exit(exitCode);
