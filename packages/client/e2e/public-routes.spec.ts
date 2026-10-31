/**
 * US0.4 - E2E: rutas públicas renderizan en ambos idiomas
 * Playwright - verificación de que cada ruta declarada en routes.ts existe en es y en
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PUBLIC_ROUTES = [
  { key: 'venta', es: '/es/venta', en: '/en/sale' },
  { key: 'alquiler', es: '/es/alquiler', en: '/en/rent' },
  { key: 'proyectos', es: '/es/proyectos', en: '/en/projects' },
  { key: 'servicios', es: '/es/servicios', en: '/en/services' },
  { key: 'nosotros', es: '/es/nosotros', en: '/en/about-us' },
  { key: 'contacto', es: '/es/contacto', en: '/en/contact' },
  { key: 'privacidad', es: '/es/aviso-de-privacidad', en: '/en/privacy-notice' },
  { key: 'datos', es: '/es/politica-de-tratamiento-de-datos', en: '/en/data-processing-policy' },
  { key: 'terminos', es: '/es/terminos', en: '/en/terms' },
];

for (const route of PUBLIC_ROUTES) {
  test.describe(`ruta ${route.key}`, () => {
    test(`es: ${route.es} renderiza con h1`, async ({ page }) => {
      await page.goto(route.es, { waitUntil: 'networkidle' });
      await expect(page).toHaveURL(route.es);
      await expect(page.locator('h1')).toBeVisible();

      const results = await new AxeBuilder({ page }).analyze();
      const criticalOrSerious = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(criticalOrSerious).toEqual([]);
    });

    test(`en: ${route.en} renderiza con h1`, async ({ page }) => {
      await page.goto(route.en, { waitUntil: 'networkidle' });
      await expect(page).toHaveURL(route.en);
      await expect(page.locator('h1')).toBeVisible();

      const results = await new AxeBuilder({ page }).analyze();
      const criticalOrSerious = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(criticalOrSerious).toEqual([]);
    });
  });
}
