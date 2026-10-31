/**
 * US0.4 - E2E: cambio de idioma entre es y en
 * Playwright - verificación de que el selector de idioma navega a la ruta equivalente
 */
import { test, expect } from '@playwright/test';

const LANGUAGE_SWITCH_CASES = [
  { from: '/es/venta', to: '/en/sale' },
  { from: '/es/alquiler', to: '/en/rent' },
  { from: '/es/proyectos', to: '/en/projects' },
  { from: '/es/servicios', to: '/en/services' },
  { from: '/es/nosotros', to: '/en/about-us' },
  { from: '/es/contacto', to: '/en/contact' },
  { from: '/es/terminos', to: '/en/terms' },
];

for (const { from, to } of LANGUAGE_SWITCH_CASES) {
  test(`cambia de ${from} a ${to}`, async ({ page }) => {
    await page.goto(from, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(from);

    // Busca el enlace de cambio de idioma (texto "Ver en inglés" o "View in Spanish")
    const switchLink = page.getByRole('link', {
      name: /ver en inglés|view in spanish/i,
    });
    await expect(switchLink).toBeVisible();
    await switchLink.click();

    await expect(page).toHaveURL(to);
  });
}
