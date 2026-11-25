/**
 * E2E (@backend): primera carga del catálogo hidratada desde el servidor (AC2.2.12).
 * Con JavaScript desactivado las tarjetas ya vienen en el HTML; con JavaScript activado el cliente
 * no repite la petición de la primera página de destacadas.
 */
import { test, expect } from './helpers/client-ip';

const RUTAS = ['/es/venta', '/es/alquiler', '/es/proyectos'] as const;

test.describe('Catálogo hidratado desde el servidor', () => {
  test.describe('sin JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    for (const ruta of RUTAS) {
      test(`${ruta}: las tarjetas llegan en el HTML`, { tag: '@backend' }, async ({ page }) => {
        await page.goto(ruta);
        await expect(page.locator('article a[href*="/propiedad/"]').first()).toBeAttached();
      });
    }
  });

  for (const ruta of RUTAS) {
    test(
      `${ruta}: el cliente no repite la primera página`,
      { tag: '@backend' },
      async ({ page }) => {
        const peticiones: string[] = [];
        page.on('request', (req) => {
          const url = new URL(req.url());
          if (url.pathname === '/api/properties') peticiones.push(url.search);
        });
        await page.goto(ruta);
        await expect(page.locator('article').first()).toBeVisible();
        await page.waitForLoadState('networkidle');
        const primeraPagina = peticiones.filter(
          (q) => q.includes('destacada=true') && !q.includes('cursor='),
        );
        expect(primeraPagina).toEqual([]);
      },
    );
  }
});
