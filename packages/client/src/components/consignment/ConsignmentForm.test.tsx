import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import es from '../../../messages/es.json';
import en from '../../../messages/en.json';
import { ConsignmentForm } from './ConsignmentForm';

// El setup global simula next-intl y @/lib/whatsapp; aquí se sustituyen: los textos son
// «consign.<clave>» y el helper de WhatsApp es el real (para comprobar el enlace de respaldo).
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
  useLocale: () => 'es',
}));
vi.mock('@/lib/whatsapp', async (importOriginal) => importOriginal());

const POLICY_HREF = '/es/politica-de-tratamiento-de-datos';
const NUMBER = '573000000000';

type Props = ComponentProps<typeof ConsignmentForm>;

function renderForm(props: Partial<Props> = {}) {
  return render(
    <MantineProvider>
      <ConsignmentForm
        locale="es"
        whatsappNumber={NUMBER}
        dataPolicyHref={POLICY_HREF}
        {...props}
      />
    </MantineProvider>,
  );
}

const labelOf = (name: string) => new RegExp(`^consign\\.fields\\.${name}\\b`);
const field = (name: string) => screen.getByLabelText(labelOf(name));
const consent = () => screen.getByLabelText(/^consign\.consent\.label/);
const submitButton = () => screen.getByRole('button', { name: /^consign\.submit/ });
const honeypot = () => document.querySelector<HTMLInputElement>('input[name="sitio"]');

function enter(name: string, value: string) {
  fireEvent.change(field(name), { target: { value } });
}

function fillValid() {
  enter('nombre', 'Ana Pérez');
  enter('telefono', '300 123 4567');
  enter('email', 'ana@example.com');
  enter('tipo', 'CASA');
  enter('departamento', 'Antioquia');
  enter('municipio', 'Medellín');
  fireEvent.click(consent());
}

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const ok = () => json(200, { success: true, data: { enviado: true } });
const failure = (status: number, code: string) =>
  json(status, { success: false, data: { code }, message: 'x' });

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

const lastBody = () =>
  JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body)) as Record<string, unknown>;

beforeAll(() => {
  // Mantine consulta matchMedia al montar; jsdom no lo trae.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>(async () => ok());
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

describe('AC3.1.1 | campos del formulario', () => {
  it('tiene datos personales, datos del inmueble y consentimiento', () => {
    renderForm();
    for (const name of [
      'nombre',
      'telefono',
      'email',
      'tipo',
      'departamento',
      'municipio',
      'valor',
      'areaConstruida',
      'areaLote',
      'mensaje',
    ]) {
      expect(field(name)).toBeInTheDocument();
    }
    expect(consent()).toBeInTheDocument();
    expect(screen.getByText('consign.sections.personal')).toBeInTheDocument();
    expect(screen.getByText('consign.sections.property')).toBeInTheDocument();
  });

  it('son obligatorios nombre, teléfono, email, tipo, departamento, municipio y consentimiento', () => {
    renderForm();
    for (const name of ['nombre', 'telefono', 'email', 'tipo', 'departamento', 'municipio']) {
      expect(field(name)).toBeRequired();
    }
    expect(consent()).toBeRequired();
  });

  it('valor, áreas y mensaje son opcionales', () => {
    renderForm();
    for (const name of ['valor', 'areaConstruida', 'areaLote', 'mensaje']) {
      expect(field(name)).not.toBeRequired();
    }
  });

  it('el tipo ofrece los 8 tipos del contrato más el marcador', () => {
    renderForm();
    expect(field('tipo').querySelectorAll('option')).toHaveLength(9);
  });

  it('el municipio está deshabilitado hasta elegir departamento y entonces lista sus municipios', () => {
    renderForm();
    expect(field('municipio')).toBeDisabled();
    enter('departamento', 'Antioquia');
    expect(field('municipio')).toBeEnabled();
    expect(field('municipio').querySelectorAll('option')).toHaveLength(8);
  });

  it('cambiar el departamento descarta el municipio anterior también del estado (no se envía mezclado)', async () => {
    renderForm();
    fillValid();
    enter('departamento', 'Bolívar');
    fireEvent.click(submitButton());
    await waitFor(() =>
      expect(field('municipio')).toHaveAccessibleDescription('consign.errors.required'),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cambiar el departamento reinicia el municipio', () => {
    renderForm();
    enter('departamento', 'Antioquia');
    enter('municipio', 'Medellín');
    expect(field('municipio')).toHaveValue('Medellín');
    enter('departamento', 'Bolívar');
    expect(field('municipio')).toHaveValue('');
  });
});

describe('AC3.1.2 | errores junto a cada campo y datos conservados', () => {
  it('con el formulario vacío no envía y marca cada campo obligatorio', async () => {
    renderForm();
    fireEvent.click(submitButton());
    await waitFor(() => expect(screen.getAllByText('consign.errors.required')).toHaveLength(6));
    expect(screen.getByText('consign.errors.consentRequired')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    for (const name of ['nombre', 'telefono', 'email', 'tipo', 'departamento', 'municipio']) {
      expect(field(name)).toHaveAccessibleDescription('consign.errors.required');
    }
  });

  it('no usa notificación flotante ni alerta global para errores de validación', async () => {
    renderForm();
    fireEvent.click(submitButton());
    await waitFor(() =>
      expect(screen.getAllByText('consign.errors.required').length).toBeGreaterThan(0),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('conserva lo escrito cuando la validación falla', async () => {
    renderForm();
    enter('nombre', 'Ana Pérez');
    enter('mensaje', 'Casa esquinera');
    fireEvent.click(submitButton());
    await waitFor(() =>
      expect(screen.getAllByText('consign.errors.required').length).toBeGreaterThan(0),
    );
    expect(field('nombre')).toHaveValue('Ana Pérez');
    expect(field('mensaje')).toHaveValue('Casa esquinera');
  });

  it('un error desaparece al corregir el campo', async () => {
    renderForm();
    fireEvent.click(submitButton());
    await waitFor(() =>
      expect(field('nombre')).toHaveAccessibleDescription('consign.errors.required'),
    );
    enter('nombre', 'Ana');
    await waitFor(() =>
      expect(field('nombre')).not.toHaveAccessibleDescription('consign.errors.required'),
    );
  });
});

describe('AC3.1.3 | teléfono', () => {
  it('un teléfono inválido muestra error en el campo y no envía', async () => {
    renderForm();
    fillValid();
    enter('telefono', '2001234567');
    fireEvent.click(submitButton());
    await waitFor(() =>
      expect(field('telefono')).toHaveAccessibleDescription('consign.errors.invalidPhone'),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('un teléfono de 10 dígitos que empieza por 3 se envía como +57', async () => {
    renderForm();
    fillValid();
    fireEvent.click(submitButton());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(lastBody().telefono).toBe('+573001234567');
  });
});

describe('AC3.1.4 | envío exitoso', () => {
  it('muestra la confirmación y no ofrece botón de WhatsApp', async () => {
    const { container } = renderForm();
    fillValid();
    fireEvent.click(submitButton());
    expect(await screen.findByText('consign.success.title')).toBeInTheDocument();
    expect(screen.getByText('consign.success.body')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('consign.success.title');
    expect(screen.queryByText('consign.fallback.button')).not.toBeInTheDocument();
    expect(container.querySelector('a[href*="wa.me"]')).toBeNull();
  });

  it('envía un POST a /api/consignments con el idioma de la página', async () => {
    renderForm({ locale: 'en' });
    fillValid();
    fireEvent.click(submitButton());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/consignments');
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
    expect(lastBody()).toMatchObject({
      nombre: 'Ana Pérez',
      email: 'ana@example.com',
      tipo: 'CASA',
      departamento: 'Antioquia',
      municipio: 'Medellín',
      consent: true,
      idioma: 'en',
    });
  });
});

describe('AC3.1.5 | EMAIL_DELIVERY_FAILED: respaldo por WhatsApp', () => {
  it('conserva los datos, avisa y ofrece «Enviar por WhatsApp» con el resumen en español', async () => {
    fetchMock.mockImplementation(async () => failure(502, 'EMAIL_DELIVERY_FAILED'));
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderForm({ locale: 'en' });
    fillValid();
    fireEvent.click(submitButton());

    expect(await screen.findByText('consign.fallback.title')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(field('nombre')).toHaveValue('Ana Pérez');
    expect(field('telefono')).toHaveValue('300 123 4567');

    const link = screen.getByRole('link', { name: 'consign.fallback.button' });
    const href = link.getAttribute('href') ?? '';
    expect(href.startsWith(`https://wa.me/${NUMBER}?text=`)).toBe(true);
    const text = decodeURIComponent(href.split('?text=')[1] ?? '');
    expect(text).toContain('Hola, quiero consignar mi inmueble.');
    expect(text).toContain('Nombre: Ana Pérez');
    expect(text).toContain('Teléfono: +573001234567');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(open).not.toHaveBeenCalled(); // abrir WhatsApp es acción del usuario
  });

  it('sin número de WhatsApp configurado avisa pero no muestra el botón', async () => {
    fetchMock.mockImplementation(async () => failure(502, 'EMAIL_DELIVERY_FAILED'));
    renderForm({ whatsappNumber: null });
    fillValid();
    fireEvent.click(submitButton());
    expect(await screen.findByText('consign.fallback.title')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'consign.fallback.button' })).not.toBeInTheDocument();
  });

  it('el respaldo desaparece al volver a enviar', async () => {
    fetchMock.mockImplementationOnce(async () => failure(502, 'EMAIL_DELIVERY_FAILED'));
    renderForm();
    fillValid();
    fireEvent.click(submitButton());
    expect(await screen.findByText('consign.fallback.title')).toBeInTheDocument();
    fireEvent.click(submitButton());
    expect(await screen.findByText('consign.success.title')).toBeInTheDocument();
    expect(screen.queryByText('consign.fallback.title')).not.toBeInTheDocument();
  });
});

describe('reenvío tras un fallo', () => {
  it('el aviso anterior desaparece al volver a enviar (aunque ahora falle la validación)', async () => {
    fetchMock.mockImplementationOnce(async () => failure(502, 'EMAIL_DELIVERY_FAILED'));
    renderForm();
    fillValid();
    fireEvent.click(submitButton());
    expect(await screen.findByText('consign.fallback.title')).toBeInTheDocument();
    enter('nombre', '');
    fireEvent.click(submitButton());
    await waitFor(() =>
      expect(field('nombre')).toHaveAccessibleDescription('consign.errors.required'),
    );
    expect(screen.queryByText('consign.fallback.title')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('el error de consentimiento del servidor desaparece al reenviar', async () => {
    fetchMock.mockImplementationOnce(async () => failure(422, 'CONSENT_REQUIRED'));
    fetchMock.mockImplementationOnce(async () => failure(500, 'INTERNAL'));
    renderForm();
    fillValid();
    fireEvent.click(submitButton());
    expect(await screen.findByText('consign.errors.consentRequired')).toBeInTheDocument();
    fireEvent.click(submitButton());
    expect(await screen.findByText('consign.formErrors.generic')).toBeInTheDocument();
    expect(screen.queryByText('consign.errors.consentRequired')).not.toBeInTheDocument();
  });
});

describe('AC3.1.6 | botón deshabilitado mientras la solicitud está en curso', () => {
  it('se deshabilita, cambia el texto y no permite un segundo envío', async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((r) => (resolve = r)));
    renderForm();
    fillValid();
    fireEvent.click(submitButton());

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'consign.submitting' })).toBeDisabled(),
    );
    fireEvent.submit(screen.getByRole('button', { name: 'consign.submitting' }).closest('form')!);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => resolve(ok()));
    expect(await screen.findByText('consign.success.title')).toBeInTheDocument();
  });

  it('tras un error vuelve a habilitarse', async () => {
    fetchMock.mockImplementation(async () => failure(500, 'INTERNAL'));
    renderForm();
    fillValid();
    fireEvent.click(submitButton());
    await screen.findByText('consign.formErrors.generic');
    expect(submitButton()).toBeEnabled();
  });
});

describe('AC3.3.1 | consentimiento', () => {
  it('el checkbox no está premarcado, es obligatorio y enlaza a la política de su idioma', () => {
    renderForm();
    expect(consent()).not.toBeChecked();
    expect(consent()).toBeRequired();
    const link = screen.getByRole('link', { name: 'consign.consent.policy' });
    expect(link).toHaveAttribute('href', POLICY_HREF);
    // Se abre en otra pestaña para no perder lo escrito en el formulario.
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });
});

describe('AC3.3.2 | sin consentimiento no se envía', () => {
  it('con todo lo demás válido pero sin marcar el consentimiento, no envía', async () => {
    renderForm();
    fillValid();
    fireEvent.click(consent()); // lo desmarca
    fireEvent.click(submitButton());
    await waitFor(() =>
      expect(screen.getByText('consign.errors.consentRequired')).toBeInTheDocument(),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('si el backend responde 422 CONSENT_REQUIRED lo muestra junto al checkbox', async () => {
    fetchMock.mockImplementation(async () => failure(422, 'CONSENT_REQUIRED'));
    renderForm();
    fillValid();
    fireEvent.click(submitButton());
    expect(await screen.findByText('consign.errors.consentRequired')).toBeInTheDocument();
  });
});

describe('AC3.4.1 | honeypot', () => {
  it('existe un campo oculto «sitio», vacío, sin foco y fuera del árbol accesible', () => {
    renderForm();
    const input = honeypot();
    expect(input).not.toBeNull();
    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('aria-hidden', 'true');
    expect(input).toHaveAttribute('tabindex', '-1');
    expect(input).toHaveAttribute('autocomplete', 'off');
  });

  it('un envío normal lleva «sitio» vacío', async () => {
    renderForm();
    fillValid();
    fireEvent.click(submitButton());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(lastBody().sitio).toBe('');
  });

  it('si un bot lo rellena, el valor viaja al backend (que responde éxito sin enviar correo)', async () => {
    renderForm();
    fillValid();
    fireEvent.change(honeypot()!, { target: { value: 'http://spam.example' } });
    fireEvent.click(submitButton());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(lastBody().sitio).toBe('http://spam.example');
  });
});

describe('AC3.4.2 | otros resultados del backend', () => {
  it.each([
    ['429', () => failure(429, 'RATE_LIMITED'), 'consign.formErrors.rateLimited'],
    ['422 de validación', () => failure(422, 'VALIDATION_ERROR'), 'consign.formErrors.invalid'],
    ['500', () => failure(500, 'INTERNAL'), 'consign.formErrors.generic'],
  ])('%s muestra el aviso correspondiente y conserva los datos', async (_nombre, build, texto) => {
    fetchMock.mockImplementation(async () => build());
    renderForm();
    fillValid();
    fireEvent.click(submitButton());
    expect(await screen.findByText(texto)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(field('nombre')).toHaveValue('Ana Pérez');
  });

  it('un fallo de red muestra el aviso genérico', async () => {
    fetchMock.mockImplementation(async () => {
      throw new TypeError('fetch failed');
    });
    renderForm();
    fillValid();
    fireEvent.click(submitButton());
    expect(await screen.findByText('consign.formErrors.generic')).toBeInTheDocument();
  });
});

describe('AC3.1.7 | lo que NO debe hacer', () => {
  it('no persiste nada en el navegador ni usa CAPTCHA', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { container } = renderForm();
    fillValid();
    fireEvent.click(submitButton());
    await screen.findByText('consign.success.title');
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage).toHaveLength(0);
    expect(sessionStorage).toHaveLength(0);
    expect(container.querySelector('iframe')).toBeNull();
    expect(document.cookie).toBe('');
    setItem.mockRestore();
  });
});

describe('textos del formulario (T1)', () => {
  const read = (relative: string) =>
    readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');
  const sources = [
    read('./ConsignmentForm.tsx'),
    read('../../app/[locale]/consigne-su-propiedad/page.tsx'),
  ];
  const keysUsed = [
    ...new Set(sources.flatMap((s) => [...s.matchAll(/\bt\('([^']+)'\)/g)].map((m) => m[1]!))),
  ];
  const lookup = (tree: unknown, path: string): unknown =>
    path
      .split('.')
      .reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], tree);

  it('no hay claves de traducción dinámicas (plantillas) que escapen a la verificación', () => {
    for (const source of sources) expect(source).not.toMatch(/\bt\(`/);
  });

  it('el componente y la página usan claves', () => {
    expect(keysUsed.length).toBeGreaterThan(30);
  });

  it.each([
    ['es', es],
    ['en', en],
  ])('%s.json trae todas las claves usadas, con texto', (_idioma, messages) => {
    for (const key of keysUsed) {
      const value = lookup(messages.consign, key);
      expect(typeof value === 'string' && value.trim() !== '', `consign.${key}`).toBe(true);
    }
  });

  it('es.json y en.json tienen las mismas claves en consign', () => {
    const flatten = (node: unknown, prefix = ''): string[] =>
      typeof node === 'object' && node !== null
        ? Object.entries(node).flatMap(([k, v]) => flatten(v, `${prefix}${k}.`))
        : [prefix.slice(0, -1)];
    expect(flatten(es.consign).sort()).toEqual(flatten(en.consign).sort());
  });

  it('la autorización del consentimiento usa el texto del AC3.3.1', () => {
    expect(es.consign.consent.label).toBe('Autorizo el Tratamiento de Datos Personales');
  });
});
