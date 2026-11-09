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
