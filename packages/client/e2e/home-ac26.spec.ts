/**
 * AC2.6 - E2E: Portada (Home) completa con backend real
 * Playwright - verificación de bloques A (destacadas), B (servicios), C (Nosotros)
 * AC2.6.2: vista previa de servicios (desde /api/v1/services, solo ACTIVE)
 * AC2.6.3: destacadas ACTIVE con destacada=true desde /api/v1/properties/featured
 *          (el caso HIDDEN/DELETED no se cubre aquí)
 * AC2.6.4: bloque Nosotros con el extracto real de /api/v1/about (respaldo a español)
 * AC2.6.5: bloque oculto sin datos o con el backend caído: NO cubierto por E2E (tests en
 *          skip porque el fetch es del servidor); solo verificado a mano en vivo.
 * Sin AC: responsive de la portada (layout) y consola limpia.
 */
import { test, expect, type Page } from '@playwright/test';

const HOME_URLS = ['/es', '/en'] as const;
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 375, height: 800 },
] as const;

// Helper: captura errores de consola con prefijo [home]
async function captureHomeErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && msg.text().includes('[home]')) {
      errors.push(msg.text());
    }
  });
  return errors;
}

// Helper: verifica dimensiones del bloque Nosotros
async function verifyAboutBlockDimensions(page: Page, expectedWidth: number) {
  const aboutBlock = page.locator('[class*="aboutBlock"]').first();
  await expect(aboutBlock).toBeVisible({ timeout: 10000 });

  const blockWidth = await aboutBlock.evaluate((el) =>
    Math.round(el.getBoundingClientRect().width),
  );
  expect(blockWidth).toBe(expectedWidth);

  // Verificar una sola columna (gridTemplateColumns = '720px' o '343px')
  const gridCols = await aboutBlock.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  expect(gridCols).toBe(`${expectedWidth}px`);

  // Verificar sin desborde horizontal
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasOverflow).toBe(false);

  return aboutBlock;
}

// Helper: verifica enlaces a /nosotros en nav, main, footer
async function verifyNosotrosLinks(page: Page, locale: string) {
  const href = locale === 'es' ? '/es/nosotros' : '/en/about-us';
  const links = await page.locator(`a[href="${href}"]`).all();
  const contexts = await Promise.all(
    links.map(async (link) => {
      const nav = await link.locator('xpath=ancestor::nav').count();
      const footer = await link.locator('xpath=ancestor::footer').count();
      const main = await link.locator('xpath=ancestor::main').count();
      if (nav > 0) return 'nav';
      if (footer > 0) return 'footer';
      if (main > 0) return 'main';
      return 'otro';
    }),
  );
  // Debe haber al menos nav, main, footer
  expect(contexts).toContain('nav');
  expect(contexts).toContain('main');
  expect(contexts).toContain('footer');
}

test.describe.configure({ retries: 0 });

// ===== AC2.6.3: Bloque A - Destacadas reales =====
for (const locale of HOME_URLS) {
  test.describe(`AC2.6.3 | Portada ${locale} - Destacadas reales`, () => {
    test(
      `carga PropertyCard desde /api/v1/properties/featured`,
      { tag: '@backend' },
      async ({ page }) => {
        await page.goto(locale, { waitUntil: 'networkidle' });

        // Verificar que existe la sección de destacadas
        const featuredSection = page.locator('[class*="featuredSection"]').first();
        await expect(featuredSection).toBeVisible({ timeout: 10000 });

        // Verificar PropertyCard(s) - al menos una si hay datos
        const propertyCards = page.locator('[class*="_card"]').first();
        await expect(propertyCards).toBeVisible({ timeout: 10000 });

        // Verificar estructura básica de PropertyCard
        const firstCard = propertyCards;
        await expect(firstCard.locator('img, [class*="image"]').first()).toBeVisible();
        // Precio: puede ser "$ 150.000.000" (es) o "COP 150,000,000" (en)
        await expect(
          firstCard.locator('text=/\\$\\s*[\\d.,]+|COP\\s*[\\d.,]+/').first(),
        ).toBeVisible();
        // Ubicación
        await expect(
          firstCard.locator('[class*="specItem"], [class*="location"]').first(),
        ).toBeVisible();
      },
    );
  });
}

// ===== AC2.6.2: Bloque B - Servicios =====
for (const locale of HOME_URLS) {
  test.describe(`AC2.6.2 | Portada ${locale} - Servicios`, () => {
    test(
      'muestra servicios ACTIVE desde /api/v1/services',
      { tag: '@backend' },
      async ({ page }) => {
        await page.goto(locale, { waitUntil: 'networkidle' });

        const servicesSection = page
          .locator('[class*="servicesPreview"], [class*="servicesSection"]')
          .first();
        await expect(servicesSection).toBeVisible({ timeout: 10000 });

        // Verificar al menos 2 servicios (asesoria-legal orden 1, administracion orden 2)
        const serviceCards = page.locator('[class*="serviceCard"], [class*="ServiceCard"]');
        const count = await serviceCards.count();
        expect(count).toBeGreaterThanOrEqual(2);

        // Verificar contenido esperado
        const serviceText = await servicesSection.textContent();
        expect(serviceText).toMatch(/asesor|legal|administrac|gestion/i);
      },
    );
  });
}

// ===== AC2.6.4: Bloque C - Nosotros (extracto real) =====
for (const locale of HOME_URLS) {
  test.describe(`AC2.6.4 | Portada ${locale} - Nosotros extracto real`, () => {
    test(
      'muestra extracto de /api/v1/about con fallback a español',
      { tag: '@backend' },
      async ({ page }) => {
        await page.goto(locale, { waitUntil: 'networkidle' });

        const aboutBlock = page.locator('[class*="aboutBlock"]').first();
        await expect(aboutBlock).toBeVisible({ timeout: 10000 });

        // Verificar extracto (texto real del backend)
        const aboutContent = page
          .locator('[class*="aboutContent"], [class*="aboutExtract"]')
          .first();
        await expect(aboutContent).toBeVisible();

        const text = await aboutContent.textContent();
        expect(text).toBeTruthy();
        expect(text!.length).toBeGreaterThan(20);

        // En español: "Tu socio de confianza en transacciones inmobiliarias"
        // En inglés: "Your trusted partner in real estate transactions"
        if (locale === '/es') {
          expect(text).toMatch(/socio de confianza|transacciones inmobiliarias/i);
        } else {
          expect(text).toMatch(/trusted partner|real estate transactions/i);
        }

        // Verificar botón CTA a /nosotros o /about-us
        const ctaHref = locale === '/es' ? '/es/nosotros' : '/en/about-us';
        const ctaButton = aboutBlock.locator(`a[href="${ctaHref}"]`).first();
        await expect(ctaButton).toBeVisible();
        await expect(ctaButton).toHaveAttribute('href', ctaHref);

        // Verificar enlaces en nav, main, footer
        await verifyNosotrosLinks(page, locale.slice(1));
      },
    );
  });
}

// ===== AC2.6.5: Sección oculta si vacío o error (sin cobertura E2E: test en skip, el fetch es del servidor) =====
test.describe('AC2.6.5 | Nosotros se oculta si extracto vacío o backend falla', () => {
  test.skip('simula backend fallando → sección Nosotros oculta (fetch server-side, no mockeable con Playwright)', async () => {
    // Verificado manualmente: al detener emulador Functions, sección se oculta
  });

  test.skip('simula extracto vacío → sección Nosotros oculta (fetch server-side, no mockeable con Playwright)', async () => {
    // Verificado manualmente
  });
});

// ===== AC2.6.5: Backend caído → portada resiliente (sin cobertura E2E: test en skip, el fetch es del servidor) =====
test.describe('AC2.6.5 | Backend caído - portada resiliente', () => {
  test.skip('todos los endpoints fallan → portada renderiza sin bloques y sin errores (fetch server-side, sin cobertura E2E)', async () => {
    // Verificado manualmente: al detener emulador Functions, portada pinta y oculta 3 bloques
  });
});

// ===== Layout: Responsive =====
for (const viewport of VIEWPORTS) {
  for (const locale of HOME_URLS) {
    test.describe(`Layout | Responsive ${viewport.name} ${viewport.width}px - ${locale}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test(
        'dimensiones correctas, sin desborde, 1 columna',
        { tag: '@backend' },
        async ({ page }) => {
          await page.goto(locale, { waitUntil: 'networkidle' });

          const expectedWidth = viewport.width === 1280 ? 720 : 343;
          await verifyAboutBlockDimensions(page, expectedWidth);
        },
      );
    });
  }
}

// ===== Consola limpia: 0 errores [home] =====
for (const locale of HOME_URLS) {
  test.describe(`Portada ${locale} - Consola limpia`, () => {
    test('sin errores [home] en consola del navegador', async ({ page }) => {
      const errors = await captureHomeErrors(page);
      await page.goto(locale, { waitUntil: 'networkidle' });
      // Esperar un poco para capturar errores tardíos
      await page.waitForTimeout(1000);
      expect(errors).toHaveLength(0);
    });
  });
}
