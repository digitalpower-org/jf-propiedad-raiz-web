/**
 * US0.4 - E2E: cambio de idioma entre es y en
 * Playwright - verificación de que el selector de idioma navega a la ruta equivalente
 */
import { test, expect } from '@playwright/test';

const LANGUAGE_SWITCH_CASES = [
  { from: '/es/venta', to: '/en/sale' },
  { from: '/es/alquiler', to: '/en/rent' },
  { from: '/es/proyectos', to: '/en/projects' },
  { from: '/es/servicios', to: '/en/services' },
  { from: '/es/nosotros', to: '/en/about-us' },
  { from: '/es/contacto', to: '/en/contact' },
  { from: '/es/terminos', to: '/en/terms' },
];

const QUERY_SWITCH_CASES = [
  { from: '/es/venta?page=2', to: '/en/sale?page=2' },
  {
    from: '/es/alquiler?tipo=CASA&departamento=Antioquia',
    to: '/en/rent?tipo=CASA&departamento=Antioquia',
  },
];

for (const { from, to } of LANGUAGE_SWITCH_CASES) {
  test(`navbar: cambia de ${from} a ${to}`, async ({ page }) => {
    await page.goto(from, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(from);

    await expect(page.locator('nav')).toBeVisible();

    const switchLink = page.locator('nav').getByRole('link', {
      name: /ver en inglés|view in spanish/i,
    });
    await expect(switchLink).toBeVisible();
    await switchLink.click();

    await expect(page).toHaveURL(to);
  });
}

for (const { from, to } of LANGUAGE_SWITCH_CASES) {
  test(`footer: cambia de ${from} a ${to}`, async ({ page }) => {
    await page.goto(from, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(from);

    await expect(page.locator('footer')).toBeVisible();

    const footerSwitchLink = page.locator('footer').getByRole('link', {
      name: /ver en inglés|view in spanish/i,
    });
    await expect(footerSwitchLink).toBeVisible();
    await footerSwitchLink.click();

    await expect(page).toHaveURL(to);
  });
}

for (const { from, to } of QUERY_SWITCH_CASES) {
  test(`navbar: query cambia de ${from} a ${to}`, async ({ page }) => {
    await page.goto(from, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(from);

    await expect(page.locator('nav')).toBeVisible();

    const switchLink = page.locator('nav').getByRole('link', {
      name: /ver en inglés|view in spanish/i,
    });
    await expect(switchLink).toBeVisible();
    await switchLink.click();

    await expect(page).toHaveURL(to);
  });
}

for (const { from, to } of QUERY_SWITCH_CASES) {
  test(`footer: query cambia de ${from} a ${to}`, async ({ page }) => {
    await page.goto(from, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(from);

    await expect(page.locator('footer')).toBeVisible();

    const footerSwitchLink = page.locator('footer').getByRole('link', {
      name: /ver en inglés|view in spanish/i,
    });
    await expect(footerSwitchLink).toBeVisible();
    await footerSwitchLink.click();

    await expect(page).toHaveURL(to);
  });
}

test('navbar: WhatsApp href usa buildWhatsAppUrl helper', async ({ page }) => {
  await page.goto('/es/venta', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('nav')).toBeVisible();

  const whatsappLink = page.locator('nav').getByRole('link', { name: /whatsapp/i });
  await expect(whatsappLink).toBeVisible();

  const href = await whatsappLink.getAttribute('href');
  expect(href).toBeTruthy();
  expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=[^\s]+$/);
});

test('footer: WhatsApp href usa buildWhatsAppUrl helper', async ({ page }) => {
  await page.goto('/es/venta', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('footer')).toBeVisible();

  const whatsappLink = page.locator('footer').getByRole('link', { name: /whatsapp/i });
  await expect(whatsappLink).toBeVisible();

  const href = await whatsappLink.getAttribute('href');
  expect(href).toBeTruthy();
  expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=[^\s]+$/);
});

// Las fichas de propiedad necesitan el seed de catálogo (MT2.4); el slug de
// servicio se resuelve sin backend, así que se queda en el gate 7.
// AC0.4.3: "llegar a la ruta equivalente conservando el slug"
// AC0.4.7: "el slug es el mismo en ambos idiomas"
const SLUG_SWITCH_CASES: { from: string; to: string; backend: boolean }[] = [
  {
    from: '/es/propiedad/apartamento-en-venta-en-quinta-JF-0001',
    to: '/en/property/apartamento-en-venta-en-quinta-JF-0001',
    backend: true,
  },
  {
    from: '/es/propiedad/lote-urbano-en-copacabana-JF-0011',
    to: '/en/property/lote-urbano-en-copacabana-JF-0011',
    backend: true,
  },
  {
    from: '/es/servicios/asesoria-legal',
    to: '/en/services/asesoria-legal',
    backend: false,
  },
];

for (const { from, to, backend } of SLUG_SWITCH_CASES) {
  test(
    `navbar: slug cambia de ${from} a ${to}`,
    { tag: backend ? '@backend' : [] },
    async ({ page }) => {
      await page.goto(from, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(from);

      await expect(page.locator('nav').first()).toBeVisible();

      const switchLink = page
        .locator('nav')
        .first()
        .getByRole('link', {
          name: /ver en inglés|view in spanish/i,
        });
      await expect(switchLink).toBeVisible();
      await switchLink.click();

      await expect(page).toHaveURL(to);
    },
  );
}

for (const { from, to, backend } of SLUG_SWITCH_CASES) {
  test(
    `footer: slug cambia de ${from} a ${to}`,
    { tag: backend ? '@backend' : [] },
    async ({ page }) => {
      await page.goto(from, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(from);

      await expect(page.locator('footer')).toBeVisible();

      const footerSwitchLink = page.locator('footer').getByRole('link', {
        name: /ver en inglés|view in spanish/i,
      });
      await expect(footerSwitchLink).toBeVisible();
      await footerSwitchLink.click();

      await expect(page).toHaveURL(to);
    },
  );
}
