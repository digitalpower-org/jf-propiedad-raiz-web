#!/usr/bin/env node
/**
 * report.mjs
 * Ejecuta en orden: vitest (JSON), eslint (JSON), playwright (JSON),
 * analyze:bundle (salida literal), generate-dod-report (generador).
 * Antes de generar, compara fechas de JSON vs última modificación de src/, e2e/, messages/.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const REPORTS_DIR = path.join(ROOT, 'docs/reports');

function runCmd(cmd, cwd = ROOT, options = {}) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8', stdio: 'pipe', maxBuffer: 10 * 1024 * 1024, shell: true, ...options }).trim();
  } catch (e) {
    if (e.stdout) return e.stdout.toString().trim();
    throw new Error(`Error running: ${cmd}\n${e.message}`);
  }
}

function mtimeOfDir(dir) {
  let latest = 0;
  function walk(p) {
    try {
      const stat = fs.statSync(p);
      if (stat.isDirectory()) {
        for (const entry of fs.readdirSync(p)) {
          walk(path.join(p, entry));
        }
      } else {
        latest = Math.max(latest, stat.mtimeMs);
      }
    } catch {}
  }
  walk(dir);
  return latest;
}

function jsonIsStale(jsonPath, dirs) {
  if (!fs.existsSync(jsonPath)) return true;
  const jsonMtime = fs.statSync(jsonPath).mtimeMs;
  for (const dir of dirs) {
    if (mtimeOfDir(dir) > jsonMtime) return true;
  }
  return false;
}

// Directories whose changes should invalidate cached JSON
const WATCHED_DIRS = [
  path.join(ROOT, 'packages/client/src'),
  path.join(ROOT, 'packages/client/e2e'),
  path.join(ROOT, 'packages/client/messages'),
];

const JSON_FILES = [
  path.join(REPORTS_DIR, 'vitest-results.json'),
  path.join(REPORTS_DIR, 'eslint-results.json'),
  path.join(REPORTS_DIR, 'playwright-results.json'),
];

// Check staleness before running
let needsRerun = false;
for (const jf of JSON_FILES) {
  if (jsonIsStale(jf, WATCHED_DIRS)) {
    console.log(`⚠️  ${jf} está desactualizado respecto a src/, e2e/ o messages/. Se regenerará.`);
    needsRerun = true;
  }
}

if (!needsRerun) {
  console.log('✅ Todos los JSON están actualizados. Se saltan las ejecuciones.');
}

// Step 1: vitest
if (needsRerun || !fs.existsSync(path.join(REPORTS_DIR, 'vitest-results.json'))) {
  console.log('📥 Ejecutando vitest...');
  const vitestOut = runCmd('VITE_CONFIG_NATIVE_IGNORE_WARNING=true cd packages/client && npx vitest run --reporter=json', ROOT);
  fs.writeFileSync(path.join(REPORTS_DIR, 'vitest-results.json'), vitestOut);
  console.log(`   ${vitestOut.split('\n').find(l => l.includes('Tests')) || vitestOut.split('\n').pop()}`);
}

// Step 2: eslint
if (needsRerun || !fs.existsSync(path.join(REPORTS_DIR, 'eslint-results.json'))) {
  console.log('📥 Ejecutando eslint...');
  const eslintOut = runCmd('cd packages/client && npm run lint -- --format=json 2>&1', ROOT);
  fs.writeFileSync(path.join(REPORTS_DIR, 'eslint-results.json'), eslintOut);
  console.log('   eslint ejecutado');
}

// Step 3: playwright
if (needsRerun || !fs.existsSync(path.join(REPORTS_DIR, 'playwright-results.json'))) {
  console.log('📥 Ejecutando playwright...');
  const pwOut = runCmd('cd packages/client && npx playwright test --reporter=json', ROOT);
  fs.writeFileSync(path.join(REPORTS_DIR, 'playwright-results.json'), pwOut);
  console.log('   playwright ejecutado');
}

// Step 4: analyze:bundle
if (needsRerun || !fs.existsSync(path.join(REPORTS_DIR, 'bundle-analysis.txt'))) {
  console.log('📥 Ejecutando analyze:bundle...');
  const bundleOut = runCmd('npm run analyze:bundle', ROOT);
  fs.writeFileSync(path.join(REPORTS_DIR, 'bundle-analysis.txt'), bundleOut);
  console.log(bundleOut);
}

// Step 5: generate-dod-report
console.log('📥 Ejecutando generate-dod-report...');
runCmd('node scripts/generate-dod-report.mjs', ROOT);
console.log('✅ Reporte generado');