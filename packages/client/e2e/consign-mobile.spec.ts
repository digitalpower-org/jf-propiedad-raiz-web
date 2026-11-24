import { expect, test } from '@playwright/test';

// US3.1 / US7.1 (DoD, UI): a 320, 375 y 414 px no hay desplazamiento horizontal, los controles
// miden al menos 44 px y el texto de los campos al menos 16 px. Sin backend: solo se carga la página.

const ES = '/es/consigne-su-propiedad';
const EN = '/en/list-your-property';
const ANCHOS = [320, 375, 414] as const;
const MIN_TACTIL = 44;
const MIN_FUENTE = 16;

const abrir = async (page: import('@playwright/test').Page, ancho: number, url: string) => {
  await page.setViewportSize({ width: ancho, height: 800 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await expect(page.locator('h1')).toBeVisible();
};

for (const ancho of ANCHOS) {
  test.describe(`US3.1 | móvil ${ancho} px`, () => {
    for (const [idioma, url] of [
      ['es', ES],
      ['en', EN],
    ] as const) {
      test(`sin desplazamiento horizontal (${idioma})`, async ({ page }) => {
        await abrir(page, ancho, url);
        const medidas = await page.evaluate(() => ({
          contenido: document.documentElement.scrollWidth,
          visible: document.documentElement.clientWidth,
        }));
        expect(medidas.contenido).toBeLessThanOrEqual(medidas.visible);
      });
    }

    test('campos y botón de envío ≥ 44 px, texto de los campos ≥ 16 px', async ({ page }) => {
      await abrir(page, ancho, ES);
      const controles = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll(
            'form input:not([type=hidden]):not([type=checkbox]), form select, form textarea, form button[type=submit]',
          ),
        )
          .filter((el) => el.getAttribute('name') !== 'sitio' && !el.closest('[aria-hidden=true]'))
          .map((el) => {
            const caja = el.getBoundingClientRect();
            return {
              nombre: el.getAttribute('name') ?? el.tagName.toLowerCase(),
              etiqueta: el.tagName,
              alto: Math.round(caja.height),
              ancho: Math.round(caja.width),
              fuente: parseFloat(getComputedStyle(el).fontSize),
            };
          })
          .filter((c) => c.alto > 0 && c.ancho > 0),
      );

      expect(controles.length).toBeGreaterThanOrEqual(7);
      expect(controles.filter((c) => c.alto < MIN_TACTIL || c.ancho < MIN_TACTIL)).toEqual([]);
      expect(controles.filter((c) => c.etiqueta !== 'BUTTON' && c.fuente < MIN_FUENTE)).toEqual([]);
    });

    test('casillas: el área tocable (etiqueta) mide ≥ 44 px de alto', async ({ page }) => {
      await abrir(page, ancho, ES);
      const casillas = await page.evaluate(() =>
        Array.from(document.querySelectorAll('form input[type=checkbox]')).map((el) => {
          const etiqueta =
            el.closest('label') ??
            (el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null);
          const caja = (etiqueta ?? el).getBoundingClientRect();
          return { nombre: el.getAttribute('name') ?? el.id, alto: Math.round(caja.height) };
        }),
      );

      expect(casillas.length).toBeGreaterThanOrEqual(1);
      expect(casillas.filter((c) => c.alto < MIN_TACTIL)).toEqual([]);
    });
  });
}
