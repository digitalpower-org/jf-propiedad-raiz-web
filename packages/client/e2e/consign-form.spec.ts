import { expect, test, type Page, type Route } from '@playwright/test';

// Gate 7 (sin backend): todas las respuestas de /api/consignments se simulan en el navegador.
// Los selectores se acotan a `form` y `div[role="status"]`: el Navbar y el Footer traen enlaces de
// WhatsApp y Next inyecta un role="alert" (route announcer) en todas las páginas.

const ES = '/es/consigne-su-propiedad';
const EN = '/en/list-your-property';
const OK_BODY = '{"success":true,"data":{"enviado":true}}';

const envelope = (code: string) =>
  JSON.stringify({ success: false, data: { code, details: null, requestId: 'x' }, message: 'x' });

type Handler = (route: Route) => Promise<void>;

async function openForm(page: Page, handler: Handler, url = ES) {
  const bodies: Record<string, unknown>[] = [];
  await page.route('**/api/consignments', async (route) => {
    bodies.push(JSON.parse(route.request().postData() || '{}'));
    await handler(route);
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  return bodies;
}

async function fillEs(page: Page) {
  await page.getByLabel('Nombre completo').fill('Prueba Local');
  await page.getByLabel('Teléfono').fill('300 123 4567');
  await page.getByLabel('Correo electrónico').fill('prueba@example.com');
  await page.getByLabel('Tipo de inmueble').selectOption('CASA');
  await page.getByLabel('Departamento').selectOption('Antioquia');
  await page.getByLabel('Municipio').selectOption('Medellín');
  await page.getByLabel('Autorizo el Tratamiento de Datos Personales').check();
}

const sendEs = (page: Page) =>
  page.getByRole('button', { name: /Enviar solicitud|Enviando/ }).click();

const ok: Handler = (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: OK_BODY });

const fail =
  (status: number, code: string): Handler =>
  (route) =>
    route.fulfill({ status, contentType: 'application/json', body: envelope(code) });

test.describe('US3.1 / US3.3 | formulario «Consigne su propiedad»', () => {
  test('AC3.1.2 | envío vacío: errores junto a los campos, sin alerta global y sin petición', async ({
    page,
  }) => {
    const bodies = await openForm(page, ok);
    await page.getByRole('button', { name: 'Enviar solicitud' }).click();
    await expect(page.getByText(/Debe autorizar el tratamiento/)).toBeVisible();
    await expect(page.locator('form [role="alert"]')).toHaveCount(0);
    expect(bodies).toHaveLength(0);
  });

  test('AC3.1.4 | éxito: confirmación sin enlaces ni botón de WhatsApp', async ({ page }) => {
    await openForm(page, ok);
    await fillEs(page);
    await sendEs(page);
    await expect(page.locator('div[role="status"]')).toBeVisible();
    await expect(page.getByText('¡Solicitud recibida!')).toBeVisible();
    await expect(page.locator('div[role="status"] a, div[role="status"] button')).toHaveCount(0);
    await expect(page.locator('form')).toHaveCount(0);
  });

  test('AC3.1.5 | EMAIL_DELIVERY_FAILED: aviso, datos conservados y botón de WhatsApp', async ({
    page,
    context,
  }) => {
    const bodies = await openForm(page, fail(502, 'EMAIL_DELIVERY_FAILED'));
    await fillEs(page);
    await sendEs(page);
    await expect(page.locator('form [role="alert"]')).toContainText(
      'No pudimos enviar su solicitud por correo',
    );
    const enlace = page.locator('form').getByRole('link', { name: 'Enviar por WhatsApp' });
    await expect(enlace).toHaveCount(1);
    const href = (await enlace.getAttribute('href')) ?? '';
    expect(href.startsWith('https://wa.me/')).toBe(true);
    const texto = decodeURIComponent(href.split('?text=')[1] ?? '');
    expect(texto).toContain('Hola, quiero consignar mi inmueble.');
    expect(texto).toContain('Nombre: Prueba Local');
    expect(texto).toContain('Teléfono: +573001234567');
    expect(texto).toContain('Medellín, Antioquia');
    await expect(enlace).toHaveAttribute('target', '_blank');
    await expect(enlace).toHaveAttribute('rel', /noopener/);
    expect(context.pages()).toHaveLength(1);
    await expect(page.getByLabel('Nombre completo')).toHaveValue('Prueba Local');
    await expect(page.getByLabel('Municipio')).toHaveValue('Medellín');
    await expect(page.getByRole('button', { name: 'Enviar solicitud' })).toBeEnabled();
    expect(bodies[0]).toMatchObject({
      idioma: 'es',
      consent: true,
      sitio: '',
      telefono: '+573001234567',
    });
  });

  for (const [nombre, handler, texto] of [
    ['429 RATE_LIMITED', fail(429, 'RATE_LIMITED'), 'Realizó demasiados envíos seguidos'],
    ['500', fail(500, 'INTERNAL'), 'No pudimos enviar su solicitud. Intente de nuevo'],
    [
      'caída de red',
      (route: Route) => route.abort('failed'),
      'No pudimos enviar su solicitud. Intente de nuevo',
    ],
  ] as [string, Handler, string][]) {
    test(`AC3.1.2 | ${nombre}: aviso en el formulario, datos conservados y botón reactivado`, async ({
      page,
    }) => {
      await openForm(page, handler);
      await fillEs(page);
      await sendEs(page);
      await expect(page.locator('form [role="alert"]')).toContainText(texto);
      await expect(page.getByLabel('Nombre completo')).toHaveValue('Prueba Local');
      await expect(page.getByRole('button', { name: 'Enviar solicitud' })).toBeEnabled();
    });
  }

  test('AC3.3.3 | 422 CONSENT_REQUIRED: aviso de consentimiento y datos conservados', async ({
    page,
  }) => {
    await openForm(page, fail(422, 'CONSENT_REQUIRED'));
    await fillEs(page);
    await sendEs(page);
    await expect(
      page.locator('form').getByText('Debe autorizar el tratamiento de datos personales'),
    ).toBeVisible();
    await expect(page.getByLabel('Nombre completo')).toHaveValue('Prueba Local');
    await expect(page.getByRole('button', { name: 'Enviar solicitud' })).toBeEnabled();
  });

  test('AC3.1.6 | en curso: botón deshabilitado y un solo envío pese a insistir', async ({
    page,
  }) => {
    let llamadas = 0;
    await openForm(page, async (route) => {
      llamadas++;
      await new Promise((r) => setTimeout(r, 1500));
      await route.fulfill({ status: 200, contentType: 'application/json', body: OK_BODY });
    });
    await fillEs(page);
    await sendEs(page);
    const boton = page.getByRole('button', { name: 'Enviando…' });
    await expect(boton).toBeDisabled();
    await boton.click({ force: true }).catch(() => {});
    await page.keyboard.press('Enter').catch(() => {});
    await expect(page.locator('div[role="status"]')).toBeVisible({ timeout: 5000 });
    expect(llamadas).toBe(1);
  });

  test('AC3.3.1 | inglés: política en la ruta en inglés, idioma «en» y confirmación en inglés', async ({
    page,
  }) => {
    const bodies = await openForm(page, ok, EN);
    await page.getByLabel('Full name').fill('Test User');
    await page.getByLabel('Phone').fill('300 123 4567');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Property type').selectOption('APARTAMENTO');
    await page.getByLabel('Department').selectOption('Antioquia');
    await page.getByLabel('Municipality').selectOption('Rionegro');
    await page.getByLabel('I authorize the Processing of my Personal Data').check();
    await expect(
      page.getByRole('link', { name: 'View the Data Processing Policy' }),
    ).toHaveAttribute('href', '/en/data-processing-policy');
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByText('Request received!')).toBeVisible();
    expect(bodies[0]).toMatchObject({ idioma: 'en' });
  });
});
