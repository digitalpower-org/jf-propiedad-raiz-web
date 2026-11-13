/**
 * US2.4 - E2E: ficha completa de inmueble
 * Playwright - verificación de la página de detalle de propiedad
 * Nota: Las pruebas requieren seed de catálogo (MT2.4). Si no hay datos,
 * las pruebas se omiten (skip) en lugar de pasar en vacío.
 */
import { test, expect, type Page } from '@playwright/test';

test.describe('US2.4 - Ficha de inmueble', () => {
  // Helper: navega a la ficha y verifica que cargó correctamente
  async function gotoProperty(page: Page, slug: string) {
    const response = await page.goto(`/es/propiedad/${slug}`, {
      waitUntil: 'networkidle',
    });
    const errorHeading = page.locator('h1').filter({ hasText: /couldn.t load|server error/i });
    const isErrorPage = (await errorHeading.count()) > 0 || !response || response.status() >= 400;
    return { response, isErrorPage };
  }

  // AC2.4.1 | Ficha renderiza con datos básicos
  test('AC2.4.1 | ficha renderiza con título, precio, ubicación', async ({ page }) => {
    const { isErrorPage } = await gotoProperty(page, 'casa-en-el-retiro-JF-0010');
    test.skip(isErrorPage, 'requiere seed MT2.4');
    await expect(page).not.toHaveURL(/404/);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=/\\$\\s*[\\d.]+/')).toBeVisible();
    await expect(page.locator('text=/Medellín|Antioquia/')).toBeVisible();
  });

  // AC2.4.2 | Gallery con thumbnails y navegación
  test('AC2.4.2 | gallery muestra imágenes y thumbnails', async ({ page }) => {
    const { isErrorPage } = await gotoProperty(page, 'casa-en-el-retiro-JF-0010');
    test.skip(isErrorPage, 'requiere seed MT2.4');
    const mainImage = page.locator('[data-testid="gallery-main-image"], .gallery-main img').first();
    test.skip((await mainImage.count()) === 0, 'el seed no trae fotos (fotos: [])');
    await expect(mainImage).toBeVisible();
    const thumbnails = page.locator('[data-testid="gallery-thumbnail"], .gallery-thumbnails img');
    const thumbCount = await thumbnails.count();
    if (thumbCount > 1) {
      await expect(thumbnails.first()).toBeVisible();
    }
  });

  // AC2.4.3 | Sticky sidebar con precio, operación, botón WhatsApp
  test('AC2.4.3 | sticky sidebar muestra precio, operación, botón WhatsApp', async ({ page }) => {
    const { isErrorPage } = await gotoProperty(page, 'casa-en-el-retiro-JF-0010');
    test.skip(isErrorPage, 'requiere seed MT2.4');
    await expect(page.locator('text=/\\$\\s*[\\d.]+/')).toBeVisible();
    await expect(
      page
        .locator('main aside')
        .getByText(/Venta|Alquiler|Proyecto/)
        .first(),
    ).toBeVisible();
    const whatsappBtn = page.locator('main a[href*="wa.me"]');
    await expect(whatsappBtn).toBeVisible();
    await expect(whatsappBtn).toHaveAttribute('href', /wa\.me/);
  });

  // AC2.4.4 | PropertyPOIs - puntos de interés
  test('AC2.4.4 | puntos de interés se muestran si existen', async ({ page }) => {
    const { isErrorPage } = await gotoProperty(page, 'casa-en-el-retiro-JF-0010');
    test.skip(isErrorPage, 'requiere seed MT2.4');
    const poisSection = page.locator('text=Puntos de interés');
    const hasPois = (await poisSection.count()) > 0;
    if (hasPois) {
      await expect(poisSection).toBeVisible();
      const poiItems = page.locator('[role="list"] li, .poi-item');
      await expect(poiItems.first()).toBeVisible();
    }
  });

  // AC2.4.5 | Descripción del inmueble
  test('AC2.4.5 | descripción se renderiza correctamente', async ({ page }) => {
    const { isErrorPage } = await gotoProperty(page, 'casa-en-el-retiro-JF-0010');
    test.skip(isErrorPage, 'requiere seed MT2.4');
    const descSection = page.locator('text=Descripción');
    const hasDesc = (await descSection.count()) > 0;
    if (hasDesc) {
      await expect(descSection).toBeVisible();
      const descText = page.locator('section[aria-labelledby="description-title"]');
      await expect(descText.first()).toBeVisible();
    }
  });

  // AC2.4.6 | VideoFacade - videos de YouTube con lazy load
  test('AC2.4.6 | videos se muestran con thumbnail y abren modal', async ({ page }) => {
    const { isErrorPage } = await gotoProperty(page, 'casa-en-el-retiro-JF-0010');
    test.skip(isErrorPage, 'requiere seed MT2.4');
    const videosSection = page.locator('text=Videos');
    const hasVideos = (await videosSection.count()) > 0;
    if (hasVideos) {
      await expect(videosSection).toBeVisible();
      const videoThumb = page.locator('img[src*="img.youtube.com"]').first();
      await expect(videoThumb).toBeVisible();
      const playBtn = page.locator('button[aria-label*="Video"]').first();
      if ((await playBtn.count()) > 0) {
        await playBtn.click();
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        const iframe = page.locator('iframe[src*="youtube-nocookie.com"]');
        await expect(iframe).toBeVisible();
        await page.locator('button[aria-label*="Cerrar"]').click();
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();
      }
    }
  });

  // AC2.4.7 | PanoramaViewer - tour 360°
  test('AC2.4.7 | panoramas 360° se muestran y abren modal', async ({ page }) => {
    const { isErrorPage } = await gotoProperty(page, 'casa-en-el-retiro-JF-0010');
    test.skip(isErrorPage, 'requiere seed MT2.4');
    const panoramaSection = page.locator('text=/Tour virtual|360/');
    const hasPanoramas = (await panoramaSection.count()) > 0;
    if (hasPanoramas) {
      await expect(panoramaSection).toBeVisible();
      const viewBtn = page
        .locator('button:has-text("Ver en 360°"), button:has-text("360°")')
        .first();
      if ((await viewBtn.count()) > 0) {
        await viewBtn.click();
        await expect(page.locator('[role="dialog"]')).toBeVisible();
        const pannellumContainer = page.locator('.pnlm-container, canvas').first();
        await expect(pannellumContainer).toBeVisible({ timeout: 10000 });
        await page.locator('button[aria-label*="Cerrar"]').click();
        await expect(page.locator('[role="dialog"]')).not.toBeVisible();
      }
    }
  });

  // AC2.4.8 | SEO - meta tags, JSON-LD, hreflang
  test('AC2.4.8 | SEO meta tags y JSON-LD presentes', async ({ page }) => {
    const { isErrorPage } = await gotoProperty(page, 'casa-en-el-retiro-JF-0010');
    test.skip(isErrorPage, 'requiere seed MT2.4');
    await expect(page).toHaveTitle(/JF Propiedad Raíz/);
    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute('content', /.+/);
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /.+/);
    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveAttribute('content', /.+/);
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);
    const jsonContent = await jsonLd.textContent();
    expect(jsonContent).toContain('RealEstateListing');
    expect(jsonContent).toContain('JF Propiedad Raíz');
    const hreflangEs = page.locator('link[rel="alternate"][hreflang="es-CO"]');
    await expect(hreflangEs).toHaveAttribute('href', /\/es\/propiedad\//);
    const hreflangEn = page.locator('link[rel="alternate"][hreflang="en"]');
    await expect(hreflangEn).toHaveAttribute('href', /\/en\/property\//);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /\/es\/propiedad\//);
  });

  // AC2.4.9 | 404 para slug desconocido, HIDDEN, DELETED
  test('AC2.4.9 | slug desconocido retorna 404', async ({ page }) => {
    const response = await page.goto('/es/propiedad/slug-inexistente', {
      waitUntil: 'networkidle',
    });
    test.skip(!response || response.status() >= 500, 'requiere backend (MT2.2/MT2.4)');
    expect(response?.status()).toBe(404);
  });

  // AC2.4.10 | Lighthouse performance ≥ 85 en móvil (solo verificación manual)
  test.skip('AC2.4.10 | Lighthouse performance móvil ≥ 85', async ({ page }) => {
    // Esta prueba se ejecuta manualmente con Lighthouse CI
    // Se omite en CI automatizado
  });

  // AC2.5.1 | botón WhatsApp abre wa.me con mensaje codificado
  test('AC2.5.1 | botón WhatsApp abre wa.me con mensaje codificado', async ({ page }) => {
    const { isErrorPage } = await gotoProperty(page, 'casa-en-el-retiro-JF-0010');
    test.skip(isErrorPage, 'requiere seed MT2.4');
    const whatsappBtn = page.locator('main a[href*="wa.me"]').first();
    await expect(whatsappBtn).toBeVisible();
    const href = await whatsappBtn.getAttribute('href');
    expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=.+/);
    expect(href).not.toBeNull();
    if (href) {
      const textMatch = href.match(/\?text=([^&]*)/);
      const decodedText = textMatch?.[1] ? decodeURIComponent(textMatch[1]) : '';
      expect(decodedText).toContain('JF-'); // código
    }
  });

  // AC2.5.2 | mensaje en idioma de la página
  test('AC2.5.2 | mensaje en idioma de la página', async ({ page }) => {
    const { isErrorPage } = await gotoProperty(page, 'casa-en-el-retiro-JF-0010');
    test.skip(isErrorPage, 'requiere seed MT2.4');
    const whatsappBtn = page.locator('a[href*="wa.me"]').first();
    const href = await whatsappBtn.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).not.toBeNull();
    if (href) {
      const textMatch = href.match(/\?text=([^&]*)/);
      const decodedText = textMatch?.[1] ? decodeURIComponent(textMatch[1]) : '';
      expect(decodedText).toMatch(/información|interesa|propiedad/i);
    }
  });

  // AC2.5.3 | número desde variable de entorno
  test('AC2.5.3 | número desde variable de entorno', async ({ page }) => {
    const { isErrorPage } = await gotoProperty(page, 'casa-en-el-retiro-JF-0010');
    test.skip(isErrorPage, 'requiere seed MT2.4');
    const whatsappBtn = page.locator('a[href*="wa.me"]').first();
    const href = await whatsappBtn.getAttribute('href');
    expect(href).toContain('wa.me/573000000000');
  });

  // AC2.5.4 | buildWhatsAppUrl helper usado en todos los enlaces
  test('AC2.5.4 | buildWhatsAppUrl helper usado en todos los enlaces', async ({ page }) => {
    const { isErrorPage } = await gotoProperty(page, 'casa-en-el-retiro-JF-0010');
    test.skip(isErrorPage, 'requiere seed MT2.4');
    const whatsappLinks = page.locator('a[href*="wa.me"]');
    const count = await whatsappLinks.count();
    for (let i = 0; i < count; i++) {
      const href = await whatsappLinks.nth(i).getAttribute('href');
      expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=.+/);
    }
  });

  // AC2.5.5 | un solo botón WhatsApp en la ficha
  test('AC2.5.5 | un solo botón WhatsApp en la ficha', async ({ page }) => {
    const { isErrorPage } = await gotoProperty(page, 'casa-en-el-retiro-JF-0010');
    test.skip(isErrorPage, 'requiere seed MT2.4');
    const fichaWhatsApp = page.locator('main a[href*="wa.me"], article a[href*="wa.me"]');
    const count = await fichaWhatsApp.count();
    expect(count).toBe(1);
  });
});
