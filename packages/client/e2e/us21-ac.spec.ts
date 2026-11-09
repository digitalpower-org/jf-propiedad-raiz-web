/**
 * US2.1 - Pestañas independientes (Catálogo)
 * AC2.1.1, AC2.1.2, AC2.1.4, AC2.1.5, AC2.1.6, AC2.1.7
 * Proyecto: desktop-chromium para tests de visibilidad; mobile-chromium para tests de DOM/axe
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// AC2.1.1: Menú principal con accesos a Venta, Alquiler, Proyectos, Servicios y selector de idioma
// En desktop los accesos son visibles; en mobile están ocultos (falta implementación hamburger menu)
test.describe('AC2.1.1 | Menú principal - desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('tiene accesos a Venta, Alquiler, Proyectos, Servicios y selector de idioma', async ({ page }) => {
    await page.goto('/es/venta', { waitUntil: 'domcontentloaded' });

    const nav = page.locator('nav');

    // Verificar accesos principales en navbar (desktop)
    await expect(nav.getByRole('link', { name: /venta|for sale/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /alquiler|for rent/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /proyectos|projects/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /servicios|services/i })).toBeVisible();

    // Verificar selector de idioma (LanguageSwitcher)
    await expect(nav.getByRole('link', { name: /ver en inglés|view in spanish/i })).toBeVisible();

    // Verificar que el logo permanece visible
    await expect(nav.getByRole('link', { name: /JF Propiedad Raíz/i })).toBeVisible();
  });
});

// AC2.1.1 mobile: verificar que los enlaces existen en DOM aunque ocultos por CSS
test('AC2.1.1 | Menú principal - enlaces existen en DOM en mobile (CSS display:none)', async ({ page }) => {
  await page.goto('/es/venta', { waitUntil: 'domcontentloaded' });

  // En mobile viewport, los links están en el DOM pero con display:none
  // Usamos selectores CSS directos que encuentran elementos independientemente de visibilidad
  const links = [
    page.locator('nav a[href*="/es/venta"]'),
    page.locator('nav a[href*="/es/alquiler"]'),
    page.locator('nav a[href*="/es/proyectos"]'),
    page.locator('nav a[href*="/es/servicios"]'),
  ];

  for (const link of links) {
    await expect(link).toHaveCount(1); // Existe en DOM
    // No visible por CSS (falta hamburger menu)
  }

  // Selector de idioma sí es visible
  await expect(page.locator('nav').getByRole('link', { name: /ver en inglés|view in spanish/i })).toBeVisible();
  await expect(page.locator('nav').getByRole('link', { name: /JF Propiedad Raíz/i })).toBeVisible();
});

// AC2.1.2: Filtros se resetean al cambiar pestaña
test('AC2.1.2 | Cambio de pestaña resetea filtros y parámetros', async ({ page }) => {
  await page.goto('/es/venta?page=2&tipo=CASA', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/venta\?page=2&tipo=CASA/);

  // En mobile, el enlace está dentro del menú hamburguesa, así que primero abrimos el menú
  const isMobile = page.viewportSize()?.width && page.viewportSize()!.width < 768;
  if (isMobile) {
    const menuButton = page.locator('nav').getByRole('button', { name: /abrir menú|open menu/i });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
  }

  await page.locator('nav').getByRole('link', { name: /alquiler|for rent/i }).click();

  await expect(page).toHaveURL('/es/alquiler');
  await expect(page).not.toHaveURL(/page=2/);
  await expect(page).not.toHaveURL(/tipo=CASA/);
});

// AC2.1.3: Inmueble aparece solo en pestaña de su operación
// NOTA: Requiere datos de catálogo (MT2.4 seed). Simulable con page.route mock del API.
test.skip('AC2.1.3 | Inmueble aparece solo en pestaña de su operación (requiere seed MT2.4)', async ({ page }) => {
  // Simulación con mock de API:
  // await page.route('**/api/catalog/properties*', route => {
  //   const cursor = new URL(route.request().url()).searchParams.get('cursor');
  //   // Filtrar por operacion=VENTA vs ALQUILER
  // });
  // Verificar que en /es/venta solo aparecen VENTA y en /es/alquiler solo ALQUILER
});

// AC2.1.4-2.1.7: Tests de menú hamburguesa - solo en mobile
test.describe.configure({ retries: 0 });
test.describe('AC2.1.4-2.1.7 | Menú hamburguesa - solo mobile', () => {
  test.use({ viewport: { width: 375, height: 667 }, isMobile: true });
  
  // AC2.1.4: Mobile < 768px → menú hamburguesa con label accesible
  test('AC2.1.4 | Mobile 375px: accesos detrás de botón menú con label "Abrir menú"', async ({ page }) => {
    await page.goto('/es/venta', { waitUntil: 'domcontentloaded' });

    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(375);

    await expect(page.locator('nav').getByRole('link', { name: /JF Propiedad Raíz/i })).toBeVisible();

    // Los accesos NO están en línea (están ocultos detrás del menú)
    const ventaLink = page.locator('nav').getByRole('link', { name: /venta|for sale/i });
    await expect(ventaLink).toBeHidden();

    // Existe botón de menú con nombre accesible
    const menuButton = page.locator('nav').getByRole('button', { name: /abrir menú|open menu/i });
    await expect(menuButton).toBeVisible();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(menuButton).toHaveAttribute('aria-label', /abrir menú|open menu/i);
  });

  // AC2.1.5: Click en botón menú → panel con accesos y área táctil ≥ 44×44
  test('AC2.1.5 | Panel desplegable tiene accesos con área táctil ≥ 44×44px', async ({ page }) => {
    await page.goto('/es/venta', { waitUntil: 'domcontentloaded' });

    const menuButton = page.locator('nav').getByRole('button', { name: /abrir menú|open menu/i });
    await menuButton.click();

    const panel = page.locator('nav [role="dialog"], nav .mobile-menu-panel, nav [data-mobile-menu]');
    await expect(panel).toBeVisible({ timeout: 10000 });

    const links = panel.getByRole('link');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  // AC2.1.6: Panel se cierra al navegar, con botón cerrar, Escape, click fuera
  test('AC2.1.6 | Panel se cierra: navegar, botón cerrar, Escape, click fuera', async ({ page }) => {
    await page.goto('/es/venta', { waitUntil: 'domcontentloaded' });
    const menuButton = page.locator('nav').getByRole('button', { name: /abrir menú|open menu/i });

    // Caso 1: Cerrar al navegar a un acceso
    await menuButton.click();
    await expect(page.locator('nav [role="dialog"], nav .mobile-menu-panel, nav [data-mobile-menu]')).toBeVisible();
    await page.locator('nav [role="dialog"], nav .mobile-menu-panel, nav [data-mobile-menu]').getByRole('link', { name: /alquiler|for rent/i }).click();
    await expect(page).toHaveURL('/es/alquiler');
    await expect(page.locator('nav [role="dialog"], nav .mobile-menu-panel, nav [data-mobile-menu]')).toBeHidden();

    // Caso 2: Cerrar con botón cerrar
    await page.goto('/es/venta', { waitUntil: 'domcontentloaded' });
    await menuButton.click();
    const closeButton = page.locator('nav [role="dialog"], nav .mobile-menu-panel, nav [data-mobile-menu]').getByRole('button', { name: /cerrar|close/i });
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    await expect(page.locator('nav [role="dialog"], nav .mobile-menu-panel, nav [data-mobile-menu]')).toBeHidden();

    // Caso 3: Cerrar con Escape
    await page.goto('/es/venta', { waitUntil: 'domcontentloaded' });
    await menuButton.click();
    await page.keyboard.press('Escape');
    await expect(page.locator('nav [role="dialog"], nav .mobile-menu-panel, nav [data-mobile-menu]')).toBeHidden();

    // Caso 4: Cerrar al tocar fuera
    await page.goto('/es/venta', { waitUntil: 'domcontentloaded' });
    await menuButton.click();
    await page.mouse.click(10, 10);
    await expect(page.locator('nav [role="dialog"], nav .mobile-menu-panel, nav [data-mobile-menu]')).toBeHidden();
  });

  // AC2.1.7: aria-expanded, foco, no scroll fondo, foco vuelve al botón
  test('AC2.1.7 | Panel: aria-expanded, foco trap, no scroll fondo, foco regresa', async ({ page }) => {
    await page.goto('/es/venta', { waitUntil: 'domcontentloaded' });
    const menuButton = page.locator('nav').getByRole('button', { name: /abrir menú|open menu/i });

    await menuButton.click();

    // Wait for aria-expanded to update
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true', { timeout: 10000 });

    const panel = page.locator('nav [role="dialog"], nav .mobile-menu-panel, nav [data-mobile-menu]');
    const firstFocusable = panel.locator('a, button, [tabindex]:not([tabindex="-1"])').first();
    await expect(firstFocusable).toBeFocused();

    const bodyOverflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
    expect(['hidden', 'clip']).toContain(bodyOverflow);

    await page.keyboard.press('Escape');
    await expect(menuButton).toBeFocused();
  });
});

// ===== AXE ACCESSIBILITY TESTS =====

const ACCESSIBILITY_PAGES = [
  { path: '/es', name: 'Home' },
  { path: '/es/aviso-de-privacidad', name: 'Aviso de privacidad' },
  { path: '/es/politica-de-tratamiento-de-datos', name: 'Política de tratamiento de datos' },
  { path: '/es/terminos', name: 'Términos y condiciones' },
];

for (const { path: pagePath, name } of ACCESSIBILITY_PAGES) {
  test(`AC-AXE | ${name} (${pagePath}) — sin violaciones critical/serious`, async ({ page }) => {
    await page.goto(pagePath, { waitUntil: 'domcontentloaded' });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const criticalSerious = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (criticalSerious.length > 0) {
      // Print detailed violation info including selector and HTML
      for (const v of criticalSerious) {
        console.log(`=== VIOLATION: ${(v.impact ?? 'unknown').toUpperCase()} ===`);
        console.log(`Rule: ${v.id}`);
        console.log(`Description: ${v.description}`);
        console.log(`Help: ${v.helpUrl}`);
        console.log(`Nodes affected: ${v.nodes.length}`);
        for (const node of v.nodes) {
          console.log(`  Selector: ${node.target.join(' > ')}`);
          console.log(`  HTML: ${node.html?.substring(0, 200)}...`);
        }
      }

      const details = criticalSerious
        .map((v) => `${(v.impact ?? 'unknown').toUpperCase()}: ${v.description} (${v.helpUrl}) — Nodos: ${v.nodes.length}`)
        .join('\n');
      throw new Error(`Violaciones de accesibilidad en ${name} (${pagePath}):\n${details}`);
    }
  });
}