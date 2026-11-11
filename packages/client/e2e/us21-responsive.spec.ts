import { test, expect } from '@playwright/test';

const PAGES = [
  '',
  '/venta',
  '/alquiler',
  '/proyectos',
  '/servicios',
  '/nosotros',
  '/contacto',
  '/consigne-su-propiedad',
];
const NARROW = [320, 375, 414];
const WIDE = [768, 1024];

// AC2.1.8 | sin desplazamiento horizontal y header sin desborde
for (const width of NARROW) {
  for (const path of PAGES) {
    test(`AC2.1.8 | ${width}px sin desborde horizontal en /es${path}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/es${path}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('nav').first()).toBeVisible();
      const m = await page.evaluate(() => {
        const h = document.querySelector('header') ?? document.querySelector('nav');
        return {
          doc: document.documentElement.scrollWidth,
          view: document.documentElement.clientWidth,
          header: h ? h.scrollWidth : 0,
        };
      });
      expect(m.doc, 'scrollWidth del documento').toBeLessThanOrEqual(m.view);
      expect(m.header, 'scrollWidth del header').toBeLessThanOrEqual(m.view);
    });
  }
}

test.skip('AC2.1.8 | ficha sin desborde horizontal (requiere seed MT2.4)', async () => {});

// AC2.1.9 | >= 768px: accesos en línea y sin botón de menú
for (const width of WIDE) {
  test(`AC2.1.9 | ${width}px accesos visibles y sin botón de menú`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/es', { waitUntil: 'domcontentloaded' });
    const nav = page.locator('nav').first();
    for (const name of [/venta/i, /alquiler/i, /proyectos/i, /servicios/i]) {
      await expect(nav.getByRole('link', { name }).first()).toBeVisible();
    }
    await expect(nav.getByRole('button', { name: /abrir menú|open menu/i })).toBeHidden();
  });
}
