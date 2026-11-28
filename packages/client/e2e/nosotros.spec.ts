/**
 * US5.6 - E2E: página «Nosotros» con backend real (gate 8)
 * Lo único que cubre `page.tsx`, `cache()`, `connection()` y los metadatos reales: los tests
 * unitarios no ven la página montada. Los textos salen del seed de catálogo
 * (`packages/functions/src/seed/catalog-data.ts`, `aboutCatalogo`).
 * AC5.6.1: título, secciones y equipo del documento, en el idioma de la página
 * AC5.6.2: integrante sin foto -> avatar con iniciales, sin imágenes
 * AC5.6.4 / AC2.7.1 / AC2.7.2 / AC0.4.5: título, descripción, canonical, hreflang e indexación
 * AC2.7.3: /sitemap.xml lista Nosotros en ambos idiomas cuando hay documento y título en inglés
 */

import { test, expect } from './helpers/client-ip';

const PAGINAS = [
  {
    locale: 'es',
    ruta: '/es/nosotros',
    titulo: 'JF Propiedad Raíz',
    extracto: 'Tu socio de confianza en transacciones inmobiliarias',
    secciones: ['Nuestra Visión', 'Nuestra Misión'],
    integrantes: [
      { nombre: 'Santiago González', iniciales: 'SG', cargo: 'Fundador y CEO' },
      { nombre: 'María Rodríguez', iniciales: 'MR', cargo: 'Gerente Comercial' },
    ],
  },
  {
    locale: 'en',
    ruta: '/en/about-us',
    titulo: 'JF Real Estate',
    extracto: 'Your trusted partner in real estate transactions',
    secciones: ['Our Vision', 'Our Mission'],
    integrantes: [
      { nombre: 'Santiago González', iniciales: 'SG', cargo: 'Founder and CEO' },
      { nombre: 'María Rodríguez', iniciales: 'MR', cargo: 'Commercial Manager' },
    ],
  },
] as const;

test.describe.configure({ retries: 0 });

for (const pagina of PAGINAS) {
  test.describe(`US5.6 | Nosotros ${pagina.ruta}`, () => {
    test(
      'pinta el título y las secciones del documento, sin avisos de vacío ni de error',
      { tag: '@backend' },
      async ({ page }) => {
        await page.goto(pagina.ruta);

        await expect(page.getByRole('heading', { level: 1 })).toHaveText(pagina.titulo);
        await expect(
          page.getByTestId('about-secciones').getByRole('heading', { level: 2 }),
        ).toHaveText([...pagina.secciones]);
        await expect(page.getByTestId('about-vacio')).toHaveCount(0);
        await expect(page.getByTestId('about-no-disponible')).toHaveCount(0);
      },
    );

    test(
      'muestra el equipo con avatar de iniciales y sin imágenes',
      { tag: '@backend' },
      async ({ page }) => {
        await page.goto(pagina.ruta);

        const equipo = page.getByTestId('about-equipo');
        await expect(equipo).toBeVisible();
        await expect(equipo.getByRole('heading', { level: 3 })).toHaveText(
          pagina.integrantes.map((integrante) => integrante.nombre),
        );
        for (const integrante of pagina.integrantes) {
          await expect(equipo.getByText(integrante.cargo, { exact: true })).toBeVisible();
          await expect(equipo.getByText(integrante.iniciales, { exact: true })).toHaveCount(1);
        }
        await expect(equipo.locator('img')).toHaveCount(0);
      },
    );

    test(
      'el head trae título, descripción, canonical, hreflang e indexación',
      { tag: '@backend' },
      async ({ page }) => {
        await page.goto(pagina.ruta);

        await expect(page).toHaveTitle(new RegExp(pagina.titulo));
        await expect(page.locator('meta[name="description"]')).toHaveAttribute(
          'content',
          pagina.extracto,
        );
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
          'href',
          new RegExp(`${pagina.ruta}$`),
        );
        await expect(page.locator('link[rel="alternate"][hreflang="es-CO"]')).toHaveAttribute(
          'href',
          /\/es\/nosotros$/,
        );
        await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
          'href',
          /\/en\/about-us$/,
        );
        await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
          'href',
          /\/es\/nosotros$/,
        );

        // Con documento y título en inglés, los dos idiomas se indexan (AC0.4.5).
        const robots = await page.locator('meta[name="robots"]').getAttribute('content');
        expect(robots).toMatch(/(^|,\s*)index(,|$)/);
        expect(robots).not.toMatch(/noindex/);
      },
    );
  });
}

test.describe('US5.6 | Nosotros en el sitemap (AC2.7.3)', () => {
  test(
    '/sitemap.xml lista Nosotros en español y en inglés',
    { tag: '@backend' },
    async ({ page }) => {
      const response = await page.request.get('/sitemap.xml');
      expect(response.ok()).toBe(true);
      const xml = await response.text();

      expect(xml).toMatch(/<loc>[^<]*\/es\/nosotros<\/loc>/);
      expect(xml).toMatch(/<loc>[^<]*\/en\/about-us<\/loc>/);
    },
  );
});
