import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { AboutData } from '@/server/about';
import { setLocale } from '../../test/setup';
import { AboutView } from './AboutView';

// US5.6: la página «Nosotros» pinta el documento que llega del backend, sin texto propio sobre la
// empresa, sin fecha inventada y sin pintar lo que no existe. Los textos de la prueba son de
// ejemplo; los de la página real viven en el backend.

const documento: AboutData = {
  titulo: { es: 'Nosotros SAS', en: 'About SAS' },
  extracto: { es: 'Extracto', en: 'Extract' },
  secciones: [
    {
      id: 's1',
      titulo: { es: 'Visión', en: 'Vision' },
      cuerpo: { es: 'Párrafo uno\n\nPárrafo dos', en: 'Paragraph one' },
    },
    // Sin traducción al inglés: en `en` debe verse el español (AC0.4.5).
    { id: 's2', titulo: { es: 'Misión' }, cuerpo: { es: 'Cuerpo de la misión' } },
  ],
  equipo: [
    {
      id: 'e1',
      nombre: 'María Rodríguez',
      cargo: { es: 'Gerente', en: 'Manager' },
      descripcion: { es: 'Atención al cliente' },
    },
    { id: 'e2', nombre: 'Santiago González', cargo: { es: 'Fundador' } },
  ],
};

const titulosDeSeccion = () =>
  screen.getAllByRole('heading', { level: 2 }).map((el) => el.textContent);

beforeEach(() => {
  setLocale('es');
});

describe('AboutView | contenido (AC5.6.1)', () => {
  it('muestra el título y las secciones en su orden', () => {
    render(<AboutView about={documento} locale="es" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nosotros SAS');
    expect(titulosDeSeccion().slice(0, 2)).toEqual(['Visión', 'Misión']);
  });

  it('el cuerpo se parte en párrafos', () => {
    render(<AboutView about={documento} locale="es" />);

    expect(screen.getByText('Párrafo uno').tagName).toBe('P');
    expect(screen.getByText('Párrafo dos').tagName).toBe('P');
  });

  it('muestra nombre, cargo y descripción de cada integrante', () => {
    render(<AboutView about={documento} locale="es" />);
    const equipo = screen.getByTestId('about-equipo');

    expect(equipo).toHaveTextContent('María Rodríguez');
    expect(equipo).toHaveTextContent('Gerente');
    expect(equipo).toHaveTextContent('Atención al cliente');
    expect(equipo).toHaveTextContent('Santiago González');
    expect(equipo).toHaveTextContent('Fundador');
  });
});

describe('AboutView | integrante sin foto (AC5.6.2)', () => {
  it('muestra un avatar con las iniciales y ninguna imagen', () => {
    const { container } = render(<AboutView about={documento} locale="es" />);

    expect(screen.getByText('MR')).toBeInTheDocument();
    expect(screen.getByText('SG')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('AboutView | idioma (AC0.4.5)', () => {
  it('en inglés usa la traducción y, si falta, el español', () => {
    setLocale('en');
    render(<AboutView about={documento} locale="en" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('About SAS');
    expect(titulosDeSeccion().slice(0, 2)).toEqual(['Vision', 'Misión']);
    expect(screen.getByText('Paragraph one')).toBeInTheDocument();
    expect(screen.getByText('Cuerpo de la misión')).toBeInTheDocument();
  });
});

describe('AboutView | no pinta lo que no existe', () => {
  it('control: sin equipo no hay sección de equipo', () => {
    render(<AboutView about={{ ...documento, equipo: [] }} locale="es" />);

    expect(screen.queryByTestId('about-equipo')).toBeNull();
  });

  it('control: sin secciones no hay bloque de secciones', () => {
    render(<AboutView about={{ ...documento, secciones: [] }} locale="es" />);

    expect(screen.queryByTestId('about-secciones')).toBeNull();
  });
});

describe('AboutView | estado vacío (AC5.6.3)', () => {
  it('sin documento muestra el estado vacío y mantiene el título de la página', () => {
    render(<AboutView about={null} locale="es" />);

    expect(screen.getByTestId('about-vacio')).not.toBeEmptyDOMElement();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('un documento sin secciones ni equipo también muestra el estado vacío', () => {
    render(<AboutView about={{ ...documento, secciones: [], equipo: [] }} locale="es" />);

    expect(screen.getByTestId('about-vacio')).not.toBeEmptyDOMElement();
  });

  it('control: con contenido no hay estado vacío', () => {
    render(<AboutView about={documento} locale="es" />);

    expect(screen.queryByTestId('about-vacio')).toBeNull();
  });
});

describe('AboutView | reglas de contenido (AC5.6.5)', () => {
  it('el cuerpo se pinta como texto, nunca como HTML', () => {
    const conMarcas: AboutData = {
      ...documento,
      secciones: [{ id: 's1', titulo: { es: 'Visión' }, cuerpo: { es: '<b>negrita</b>' } }],
    };
    const { container } = render(<AboutView about={conMarcas} locale="es" />);

    expect(screen.getByText('<b>negrita</b>')).toBeInTheDocument();
    expect(container.querySelector('b')).toBeNull();
  });

  it('control: no muestra ninguna fecha de «última actualización»', () => {
    render(<AboutView about={documento} locale="es" />);

    expect(screen.queryByText(/Última actualización|Last updated/i)).toBeNull();
  });
});

describe('AboutView | backend no disponible', () => {
  it('muestra un aviso propio, distinto del estado vacío, y mantiene el título', () => {
    render(<AboutView about={null} locale="es" noDisponible />);

    expect(screen.getByTestId('about-no-disponible')).not.toBeEmptyDOMElement();
    expect(screen.queryByTestId('about-vacio')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
