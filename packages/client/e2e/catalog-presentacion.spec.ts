import { expect, test, type Page } from '@playwright/test';

// Gate 7 (sin backend): /api/properties se simula en el navegador.
// US2.2 (PR-C1): etiqueta de orden (AC2.2.7), skeleton con retraso (AC2.2.9) y estado vacío con
// WhatsApp (AC2.2.10). El número de WhatsApp de prueba viene de playwright.config.ts.

const API = '**/api/properties**';

const card = (n: number) => ({
  id: `p${n}`,
  codigo: `JF-${String(n).padStart(4, '0')}`,
  slug: `inmueble-${n}`,
  operacion: 'VENTA',
  tipo: 'CASA',
  titulo: { es: `Inmueble ${n}`, en: `Property ${n}` },
  precio: 300000000 + n,
  departamento: 'Antioquia',
  municipio: 'Medellín',
  dormitorios: 3,
  banos: 2,
  areaConstruida: 90,
  estrato: 3,
  destacada: true,
  createdAt: '2026-01-01T00:00:00.000Z',
});

const TRES = [1, 2, 3].map(card);
const cards = (page: Page) => page.locator('article:has(a[href*="/propiedad/"])');

// `destacadas` responde a destacada=true; destacada=false siempre vuelve vacío.
async function simular(page: Page, destacadas: ReturnType<typeof card>[], retrasoMs = 0) {
  await page.route(API, async (route) => {
    const destacada = new URL(route.request().url()).searchParams.get('destacada') === 'true';
    if (retrasoMs > 0) await new Promise((resolver) => setTimeout(resolver, retrasoMs));
    await route.fulfill({
      json: { success: true, data: { items: destacada ? destacadas : [], nextCursor: null } },
    });
  });
}

// Cuenta cuántas veces el DOM llegó a contener una tarjeta skeleton (incluido el HTML inicial).
async function vigilarEsqueletos(page: Page) {
  await page.addInitScript(() => {
    const ventana = window as unknown as { __esqueletos: number };
    ventana.__esqueletos = 0;
    new MutationObserver(() => {
      if (document.querySelector('[data-testid="skeleton-card"]')) ventana.__esqueletos += 1;
    }).observe(document, { childList: true, subtree: true });
  });
}

const esqueletosVistos = (page: Page) =>
  page.evaluate(() => (window as unknown as { __esqueletos: number }).__esqueletos);

test.describe('US2.2 | presentación del catálogo (PR-C1)', () => {
  test('AC2.2.7 | con resultados se indica el orden: destacados primero, más recientes', async ({
    page,
  }) => {
    await simular(page, TRES);
    await page.goto('/es/venta', { waitUntil: 'networkidle' });
    await expect(cards(page)).toHaveCount(3);
    await expect(page.getByText('Destacados primero · Más recientes')).toBeVisible();
  });

  test('AC2.2.7 | sin resultados no se muestra la etiqueta de orden', async ({ page }) => {
    await simular(page, []);
    await page.goto('/es/venta', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('empty-state')).toBeVisible();
    await expect(page.getByText('Destacados primero · Más recientes')).toHaveCount(0);
  });

  test('AC2.2.9 | una respuesta rápida no llega a mostrar el skeleton', async ({ page }) => {
    await vigilarEsqueletos(page);
    await simular(page, TRES);
    await page.goto('/es/venta', { waitUntil: 'networkidle' });
    await expect(cards(page)).toHaveCount(3);
    expect(await esqueletosVistos(page)).toBe(0);
  });

  test('AC2.2.9 | con un filtro activo y páginas rápidas tampoco se muestra el skeleton', async ({
    page,
  }) => {
    await vigilarEsqueletos(page);
    // Dos páginas de destacadas y ninguna con estrato 6: el vacío diferido se resuelve rápido.
    await page.route(API, async (route) => {
      const consulta = new URL(route.request().url()).searchParams;
      const destacada = consulta.get('destacada') === 'true';
      const segunda = consulta.get('cursor') !== null;
      const items = destacada ? (segunda ? [card(4)] : TRES) : [];
      const nextCursor = destacada && !segunda ? 'c1' : null;
      await route.fulfill({ json: { success: true, data: { items, nextCursor } } });
    });
    await page.goto('/es/venta?estrato=6', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('empty-state')).toBeVisible();
    expect(await esqueletosVistos(page)).toBe(0);
  });

  test('AC2.2.9 | una respuesta lenta sí muestra el skeleton mientras llega', async ({ page }) => {
    await simular(page, TRES, 1500);
    await page.goto('/es/venta');
    await expect(page.getByTestId('skeleton-card').first()).toBeVisible();
    await expect(cards(page)).toHaveCount(3);
    await expect(page.getByTestId('skeleton-card')).toHaveCount(0);
  });

  test('AC2.2.10 | sin resultados: invitación, WhatsApp con los filtros y filtros conservados', async ({
    page,
  }) => {
    await simular(page, []);
    await page.goto(
      '/es/venta?tipo=CASA&departamento=Antioquia&municipio=Medell%C3%ADn&estrato=3',
      { waitUntil: 'networkidle' },
    );

    const vacio = page.getByTestId('empty-state');
    await expect(vacio).toBeVisible();
    await expect(vacio.getByText('No encontramos propiedades')).toBeVisible();
    await expect(vacio.getByText(/cuéntanos qué buscas/i)).toBeVisible();

    const enlace = vacio.getByRole('link', { name: /whatsapp/i });
    const href = (await enlace.getAttribute('href')) ?? '';
    expect(href).toContain('https://wa.me/573000000000?text=');
    const mensaje = decodeURIComponent(href.split('?text=')[1] ?? '');
    expect(mensaje).toContain('Casa, Medellín (Antioquia), estrato 3');

    // Los filtros se conservan: siguen en la URL.
    const consulta = new URL(page.url()).searchParams;
    expect(consulta.get('tipo')).toBe('CASA');
    expect(consulta.get('municipio')).toBe('Medellín');
    expect(consulta.get('estrato')).toBe('3');
  });
});
