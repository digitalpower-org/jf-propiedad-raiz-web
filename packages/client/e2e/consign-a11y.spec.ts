import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const RUTAS = [
  { idioma: 'es', url: '/es/consigne-su-propiedad' },
  { idioma: 'en', url: '/en/list-your-property' },
] as const;

const MAX_TABULACIONES = 60;

for (const ruta of RUTAS) {
  test.describe(`US3.1 | accesibilidad (${ruta.idioma})`, () => {
    test('DoD 2.7 | sin violaciones críticas ni serias (axe)', async ({ page }) => {
      await page.goto(ruta.url, { waitUntil: 'networkidle' });
      await expect(page.locator('h1')).toBeVisible();
      const resultado = await new AxeBuilder({ page }).analyze();
      const graves = resultado.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(graves).toEqual([]);
    });

    test('DoD 2.7 | el teclado llega al botón de envío sin pasar por el honeypot', async ({
      page,
    }) => {
      await page.goto(ruta.url, { waitUntil: 'networkidle' });
      let llegoAlBoton = false;
      let camposEnfocados = 0;
      for (let i = 0; i < MAX_TABULACIONES && !llegoAlBoton; i++) {
        await page.keyboard.press('Tab');
        const foco = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const caja = el.getBoundingClientRect();
          const estilo = getComputedStyle(el);
          return {
            nombre: el.getAttribute('name'),
            tipo: el.getAttribute('type'),
            dentroDelFormulario: el.closest('form') !== null,
            visible: caja.width > 0 && caja.height > 0 && estilo.visibility !== 'hidden',
          };
        });
        if (foco === null) continue;
        expect(foco.nombre).not.toBe('sitio');
        expect(foco.visible).toBe(true);
        if (foco.dentroDelFormulario) camposEnfocados++;
        if (foco.tipo === 'submit' && foco.dentroDelFormulario) llegoAlBoton = true;
      }
      expect(llegoAlBoton).toBe(true);
      expect(camposEnfocados).toBeGreaterThanOrEqual(7);
    });
  });
}
