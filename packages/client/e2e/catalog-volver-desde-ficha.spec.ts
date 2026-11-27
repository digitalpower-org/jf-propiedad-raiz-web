/**
 * E2E (@backend): al abrir una ficha y volver, el listado conserva las páginas ya cargadas y la
 * posición del scroll (AC2.3.6).
 *
 * Mide lo mismo que la comprobación manual: una marca puesta en `window` sobrevive a la ida y a la
 * vuelta (la navegación es del cliente, no recarga el documento), el listado vuelve con todas sus
 * tarjetas (si recargara, el servidor solo enviaría la primera página) y el scroll queda donde estaba.
 */
import { test, expect, type Page } from './helpers/client-ip';

const RUTA = '/es/venta';
const PAGINA = 12; // tarjetas por página del catálogo (PAGE_SIZE)
const MARGEN_SCROLL = 50; // píxeles de diferencia tolerados al restaurar el scroll

const leerMarca = (page: Page) => page.evaluate(() => Reflect.get(window, 'marca'));
const leerScroll = (page: Page) => page.evaluate(() => Math.round(window.scrollY));

// Baja hasta el final, pulsa «Cargar más» si aparece y espera el aviso de fin de lista.
async function cargarTodasLasPaginas(page: Page) {
  const fin = page.getByText('Fin de la lista').first();
  await expect(async () => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const cargarMas = page.getByRole('button', { name: 'Cargar más' });
    if (await cargarMas.isVisible()) await cargarMas.click({ timeout: 1_000 });
    await expect(fin).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
}

test.describe('Volver de la ficha al catálogo', () => {
  test(
    'AC2.3.6 | se conservan las páginas cargadas y el scroll',
    { tag: '@backend' },
    async ({ page }) => {
      await page.goto(RUTA);
      await expect(page.locator('article').first()).toBeVisible();
      await cargarTodasLasPaginas(page);

      const tarjetas = page.locator('article');
      const total = await tarjetas.count();
      // Sin segunda página real la prueba no demostraría nada: que falle si el seed cambia.
      expect(total).toBeGreaterThan(PAGINA);

      // Una tarjeta del medio a la vista, para que haya scroll que conservar.
      const tarjeta = tarjetas.nth(2);
      await tarjeta.scrollIntoViewIfNeeded();
      await page.evaluate(() => Reflect.set(window, 'marca', 'viva'));

      // Se mide en el propio clic: Playwright puede desplazar la página justo antes de pulsar.
      await page.evaluate(() =>
        document.addEventListener(
          'click',
          () => Reflect.set(window, 'scrollAlClic', window.scrollY),
          {
            capture: true,
            once: true,
          },
        ),
      );
      await tarjeta.getByRole('link', { name: 'Detalles de la propiedad' }).click();
      await expect(page).toHaveURL(/\/propiedad\//);
      await expect(page.locator('h1')).toBeVisible();
      // Navegación del cliente: el documento no se recargó, la marca sigue ahí.
      expect(await leerMarca(page)).toBe('viva');

      const scrollAlClic = await page.evaluate(() =>
        Math.round(Number(Reflect.get(window, 'scrollAlClic'))),
      );
      expect(scrollAlClic).toBeGreaterThan(0);
      await page.goBack();
      await expect(page).toHaveURL(/\/es\/venta$/);
      await expect(tarjetas).toHaveCount(total);
      expect(await leerMarca(page)).toBe('viva');
      await expect
        .poll(async () => Math.abs((await leerScroll(page)) - scrollAlClic))
        .toBeLessThan(MARGEN_SCROLL);
    },
  );
});
