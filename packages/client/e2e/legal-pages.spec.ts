/**
 * MT3.2 - E2E: páginas legales (aviso de privacidad, tratamiento de datos, términos)
 * Playwright - verificación de renderizado y accesibilidad en es y en
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('páginas legales (español)', () => {
  test('aviso de privacidad renderiza en español sin errores', async ({ page }) => {
    await page.goto('/es/aviso-de-privacidad', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL('/es/aviso-de-privacidad');
    await expect(page.locator('h1')).toContainText('Aviso de Privacidad');

    const results = await new AxeBuilder({ page }).analyze();
    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(criticalOrSerious).toEqual([]);
  });

  test('política de tratamiento de datos renderiza en español sin errores', async ({ page }) => {
    await page.goto('/es/politica-de-tratamiento-de-datos', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL('/es/politica-de-tratamiento-de-datos');
    await expect(page.locator('h1')).toContainText('Política de Tratamiento de Datos Personales');

    const results = await new AxeBuilder({ page }).analyze();
    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(criticalOrSerious).toEqual([]);
  });

  test('términos y condiciones renderiza en español sin errores', async ({ page }) => {
    await page.goto('/es/terminos', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL('/es/terminos');
    await expect(page.locator('h1')).toContainText('Términos y Condiciones de Uso');

    const results = await new AxeBuilder({ page }).analyze();
    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(criticalOrSerious).toEqual([]);
  });
});

test.describe('páginas legales (inglés)', () => {
  test('privacy notice renders in English without errors', async ({ page }) => {
    await page.goto('/en/privacy-notice', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL('/en/privacy-notice');
    await expect(page.locator('h1')).toContainText('Privacy Notice');

    const results = await new AxeBuilder({ page }).analyze();
    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(criticalOrSerious).toEqual([]);
  });

  test('data processing policy renders in English without errors', async ({ page }) => {
    await page.goto('/en/data-processing-policy', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL('/en/data-processing-policy');
    await expect(page.locator('h1')).toContainText('Personal Data Processing Policy');

    const results = await new AxeBuilder({ page }).analyze();
    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(criticalOrSerious).toEqual([]);
  });

  test('terms and conditions renders in English without errors', async ({ page }) => {
    await page.goto('/en/terms', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL('/en/terms');
    await expect(page.locator('h1')).toContainText('Terms and Conditions of Use');

    const results = await new AxeBuilder({ page }).analyze();
    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(criticalOrSerious).toEqual([]);
  });
});

const ES_LEGAL = [
  '/es/aviso-de-privacidad',
  '/es/politica-de-tratamiento-de-datos',
  '/es/terminos',
];
const EN_LEGAL = ['/en/privacy-notice', '/en/data-processing-policy', '/en/terms'];

test.describe('contenido legal (AC5.3)', () => {
  for (const path of ES_LEGAL) {
    test(`AC5.3.1 | borrador pendiente de revisión jurídica en ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      const aviso = page
        .getByRole('status')
        .filter({ hasText: 'borrador preliminar sujeto a revisión jurídica' });
      await expect(aviso).toBeVisible();
    });
  }

  for (const path of EN_LEGAL) {
    test(`AC5.3.2 | traducción de cortesía y prevalece el español en ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      const nota = page.getByRole('status').filter({ hasText: 'courtesy translation' });
      await expect(nota).toBeVisible();
      await expect(nota).toContainText('Spanish version shall prevail');
    });
  }

  test('AC5.3.3 | la política declara que los datos de formularios no se almacenan y van por Resend', async ({
    page,
  }) => {
    await page.goto('/es/politica-de-tratamiento-de-datos', { waitUntil: 'networkidle' });
    const cuerpo = page.locator('body');
    await expect(cuerpo).toContainText('no se almacenan');
    await expect(cuerpo).toContainText('Resend');
  });

  for (const path of [...ES_LEGAL, ...EN_LEGAL]) {
    test(`AC5.3.5 | sin lorem ipsum en ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      const texto = await page.locator('body').innerText();
      expect(texto.length, 'la página debe tener contenido real').toBeGreaterThan(500);
      expect(texto).not.toMatch(/lorem ipsum/i);
    });
  }
});
