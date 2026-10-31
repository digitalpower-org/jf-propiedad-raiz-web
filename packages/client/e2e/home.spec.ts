/**
 * US0.4 - E2E: portada /es y /en renderizan sin errores
 * Playwright - verificación de carga de la página principal en ambos idiomas
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('página principal (home)', () => {
  test('es renderiza en español sin errores', async ({ page }) => {
    await page.goto('/es', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL('/es');
    await expect(page.locator('h1')).toContainText('Inmuebles en el Valle de Aburrá');

    const results = await new AxeBuilder({ page }).analyze();
    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(criticalOrSerious).toEqual([]);
  });

  test('en renderiza en inglés sin errores', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL('/en');
    await expect(page.locator('h1')).toContainText('Properties in the Aburrá Valley');

    const results = await new AxeBuilder({ page }).analyze();
    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(criticalOrSerious).toEqual([]);
  });

  test('redirige / sin prefijo a /es o /en', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/es$|\/en$/);
  });
});
