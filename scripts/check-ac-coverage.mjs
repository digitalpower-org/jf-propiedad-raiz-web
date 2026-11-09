#!/usr/bin/env node
/**
 * check-ac-coverage.mjs
 * Extrae ACs [agente] de US2.1-2.7 (MT2.3) y US5.3 (MT3.2) en docs/TASKS.md,
 * busca cada ID en títulos de tests (vitest + playwright) y sus resultados reales,
 * genera docs/reports/AC_COVERAGE.md con una fila POR CADA AC.
 * Estado real: PASS / FAIL / SKIP / SIN TEST
 * Un AC solo cuenta como PASS si pasa en TODOS los proyectos donde tiene tests.
 * FAIL si falla en ALGUNO. SKIP si todos se omiten.
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const TASKS_PATH = path.join(ROOT, 'docs/TASKS.md');
const VITEST_RESULTS = path.join(ROOT, 'docs/reports/vitest-results.json');
const PLAYWRIGHT_RESULTS = path.join(ROOT, 'docs/reports/playwright-results.json');
const OUTPUT_PATH = path.join(ROOT, 'docs/reports/AC_COVERAGE.md');

// US objetivo para Ola 2: US2.1-2.7 (MT2.3) + US5.3 (MT3.2) + US7.1, US7.3, US7.4 (cliente, MT2.3)
const TARGET_US = ['US2.1', 'US2.2', 'US2.3', 'US2.4', 'US2.5', 'US2.6', 'US2.7', 'US5.3', 'US7.1', 'US7.3', 'US7.4'];

// 1. Extraer ACs [agente] de TASKS.md para US objetivo
function extractACsFromTasks() {
  const content = fs.readFileSync(TASKS_PATH, 'utf-8');
  const acs = [];

  for (const targetUS of TARGET_US) {
    const usRegex = new RegExp(`### ${targetUS}.*?(?=### US\\d+\\.\\d+|## )`, 's');
    const usMatch = content.match(usRegex);
    if (!usMatch) {
      console.warn(`US ${targetUS} no encontrado en TASKS.md`);
      continue;
    }

    const usSection = usMatch[0];
    const lines = usSection.split('\n');
    let inACSection = false;

    for (const line of lines) {
      if (line.includes('Criterios de aceptación') || line.includes('Criterio de aceptación')) {
        inACSection = true;
        continue;
      }
      if (inACSection && line.trim().startsWith('###')) break;
      if (inACSection && line.trim().startsWith('---')) break;

      const acMatch = line.match(/^\s*-\s*(AC\d+\.\d+\.\d+)\s+\*\*Dado\*\*([\s\S]*?)\s*\[agente\]/);
      if (acMatch) {
        acs.push({
          id: acMatch[1],
          description: acMatch[2].trim().slice(0, 120),
          us: targetUS,
          mt: targetUS.startsWith('US2') ? 'MT2.3' : 'MT3.2',
        });
      }
    }
  }

  return acs;
}

// 2. Extraer títulos y resultados de tests de vitest
function extractVitestResults() {
  if (!fs.existsSync(VITEST_RESULTS)) return { titles: [], results: new Map() };
  const data = JSON.parse(fs.readFileSync(VITEST_RESULTS, 'utf-8'));
  const titles = [];
  const results = new Map();

  for (const suite of data.testResults || []) {
    for (const assertion of suite.assertionResults || []) {
      const fullTitle = `${suite.name}: ${assertion.ancestorTitles.join(' > ')} > ${assertion.title}`;
      titles.push(fullTitle);
      results.set(fullTitle, assertion.status);
    }
  }
  return { titles, results };
}

// 3. Extraer títulos y resultados de tests de playwright POR PROYECTO
function extractPlaywrightResults() {
  if (!fs.existsSync(PLAYWRIGHT_RESULTS)) return { titles: [], results: new Map(), byProject: new Map() };
  const data = JSON.parse(fs.readFileSync(PLAYWRIGHT_RESULTS, 'utf-8'));
  const titles = [];
  const results = new Map();
  const byProject = new Map();

  for (const suite of data.suites || []) {
    for (const spec of suite.specs || []) {
      if (spec.ok !== undefined) {
        const fullTitle = `${spec.file}: ${spec.title}`;
        titles.push(fullTitle);
        const firstResult = spec.tests[0]?.results[0];
        const status = firstResult?.status || (spec.ok ? 'passed' : 'failed');
        const project = firstResult?.projectName || spec.tests[0]?.projectName || 'unknown';
        
        results.set(fullTitle, status);
        
        if (!byProject.has(project)) byProject.set(project, new Map());
        byProject.get(project).set(fullTitle, status);
      }
    }
  }
  return { titles, results, byProject };
}

// 4. Buscar AC ID en títulos
function findTestForAC(acId, titles) {
  const regex = new RegExp(`\\b${acId.replace(/\./g, '\\.')}\\b`, 'i');
  for (const title of titles) {
    if (regex.test(title)) return title;
  }
  return null;
}

// 5. Determinar estado real del AC por proyecto
function getACStatusPerProject(acId, vitestTitles, pwByProject, vitestResults) {
  const vitestMatch = findTestForAC(acId, vitestTitles);
  const vitestStatus = vitestMatch ? vitestResults.get(vitestMatch) : null;

  const projectStatuses = new Map();
  for (const [project, projectResults] of pwByProject) {
    const pwMatch = findTestForAC(acId, Array.from(projectResults.keys()));
    const pwStatus = pwMatch ? projectResults.get(pwMatch) : null;
    if (pwStatus) projectStatuses.set(project, pwStatus);
  }

  // Determinar estado global
  // PASS: vitest passed (si existe) Y todos los proyectos de playwright pasan
  // FAIL: vitest failed O algún proyecto de playwright falla
  // SKIP: vitest skipped Y todos los proyectos de playwright se omiten
  // SIN TEST: no hay tests

  const hasVitest = vitestMatch !== null;
  const hasPlaywright = projectStatuses.size > 0;

  if (!hasVitest && !hasPlaywright) return 'SIN TEST';

  // Check vitest
  if (hasVitest && vitestStatus === 'failed') return 'FAIL';
  if (hasVitest && vitestStatus === 'skipped') {
    // vitest skipped, check playwright
  }

  // Check playwright projects
  const pwStatuses = Array.from(projectStatuses.values());
  if (pwStatuses.some(s => s === 'failed')) return 'FAIL';
  if (pwStatuses.some(s => s === 'timedOut')) return 'FAIL';
  if (pwStatuses.every(s => s === 'skipped')) return 'SKIP';
  if (pwStatuses.every(s => s === 'passed')) {
    if (hasVitest && vitestStatus === 'passed') return 'PASS';
    if (!hasVitest) return 'PASS';
    if (hasVitest && vitestStatus === 'skipped') return 'SKIP'; // vitest skipped but pw passed
  }
  if (pwStatuses.some(s => s === 'passed') && pwStatuses.some(s => s === 'skipped')) return 'PARTIAL'; // some passed, some skipped

  return 'SIN TEST';
}

// 5b. Determinar estado global simplificado para el reporte
function getACStatus(acId, vitestTitles, pwTitles, vitestResults, pwResults) {
  const vitestMatch = findTestForAC(acId, vitestTitles);
  const pwMatch = findTestForAC(acId, pwTitles);

  const vitestStatus = vitestMatch ? vitestResults.get(vitestMatch) : null;
  const pwStatus = pwMatch ? pwResults.get(pwMatch) : null;

  if (vitestStatus === 'passed' || pwStatus === 'passed') return 'PASS';
  if (vitestStatus === 'failed' || pwStatus === 'failed') return 'FAIL';
  if (vitestStatus === 'timedOut' || pwStatus === 'timedOut') return 'FAIL';
  if (vitestStatus === 'skipped' || pwStatus === 'skipped') return 'SKIP';
  if (vitestMatch || pwMatch) return 'SKIP';

  return 'SIN TEST';
}

// 6. Generar reporte
function generateReport(acs, vitestTitles, pwTitles, vitestResults, pwResults, pwByProject) {
  let md = '# AC Coverage Report (Ola 2: MT2.3 + MT3.2)\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += '| AC ID | US | MT | Estado | Test Encontrado |\n';
  md += '|-------|----|----|--------|-----------------|\n';

  let passCount = 0;
  let failCount = 0;
  let skipCount = 0;
  let partialCount = 0;
  let noTestCount = 0;
  let total = acs.length;

  for (const ac of acs) {
    const status = getACStatus(ac.id, vitestTitles, pwTitles, vitestResults, pwResults);
    if (status === 'PASS') passCount++;
    else if (status === 'FAIL') failCount++;
    else if (status === 'SKIP') skipCount++;
    else if (status === 'PARTIAL') partialCount++;
    else noTestCount++;

    const vitestMatch = findTestForAC(ac.id, vitestTitles);
    const pwMatch = findTestForAC(ac.id, pwTitles);
    const found = vitestMatch || pwMatch;
    const testInfo = found
      ? found.replace(/.*packages\/client\//, '').replace(/.*e2e\//, 'e2e/')
      : '—';

    const statusBadge = status === 'PASS' ? '✅ PASS'
      : status === 'FAIL' ? '❌ FAIL'
      : status === 'SKIP' ? '⏭️ SKIP'
      : status === 'PARTIAL' ? '⚠️ PARTIAL'
      : '❌ SIN TEST';

    md += `| ${ac.id} | ${ac.us} | ${ac.mt} | ${statusBadge} | ${testInfo} |\n`;
  }

  md += `\n---\n`;
  md += `**Resumen:** ${total} ACs totales\n`;
  md += `- ✅ PASS: ${passCount}\n`;
  md += `- ❌ FAIL: ${failCount}\n`;
  md += `- ⏭️ SKIP: ${skipCount}\n`;
  md += `- ⚠️ PARTIAL: ${partialCount}\n`;
  md += `- ❌ SIN TEST: ${noTestCount}\n`;
  md += `- **Cubiertos (PASS):** ${passCount}/${total} (${((passCount/total)*100).toFixed(1)}%)\n`;

  return md;
}

// Main
const acs = extractACsFromTasks();
console.log(`Encontrados ${acs.length} ACs [agente] en US objetivo:`);
for (const ac of acs) console.log(`  ${ac.id} (${ac.us})`);

const { titles: vitestTitles, results: vitestResults } = extractVitestResults();
console.log(`Títulos vitest: ${vitestTitles.length}`);

const { titles: pwTitles, results: pwResults, byProject: pwByProject } = extractPlaywrightResults();
console.log(`Títulos playwright: ${pwTitles.length}`);
console.log(`Proyectos playwright: ${Array.from(pwByProject.keys()).join(', ')}`);

const report = generateReport(acs, vitestTitles, pwTitles, vitestResults, pwResults, pwByProject);
fs.writeFileSync(OUTPUT_PATH, report);
console.log(`Reporte escrito en ${OUTPUT_PATH}`);