import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderEmpty } from './property-grid-hooks';

// AC2.2.10: sin resultados se invita a dar más información y se ofrece WhatsApp.
// El traductor de prueba devuelve la clave, así que se comprueban claves, no textos.
const t = ((clave: string) => clave) as never;
const URL_WHATSAPP = 'https://wa.me/573000000000?text=Hola';

describe('renderEmpty | estado vacío (AC2.2.10)', () => {
  it('muestra título, pista e invitación a dar más información', () => {
    render(renderEmpty(t, URL_WHATSAPP));
    expect(screen.getByText('emptyTitle')).toBeTruthy();
    expect(screen.getByText('emptyHint')).toBeTruthy();
    expect(screen.getByText('emptyInvite')).toBeTruthy();
  });

  it('con número de WhatsApp: botón que abre la URL en otra pestaña', () => {
    render(renderEmpty(t, URL_WHATSAPP));
    const enlace = screen.getByRole('link', { name: 'emptyWhatsapp' });
    expect(enlace.getAttribute('href')).toBe(URL_WHATSAPP);
    expect(enlace.getAttribute('target')).toBe('_blank');
    expect(enlace.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('sin número de WhatsApp: no hay botón', () => {
    render(renderEmpty(t, null));
    expect(screen.queryByText('emptyWhatsapp')).toBeNull();
  });

  it('sin segundo argumento tampoco hay botón', () => {
    render(renderEmpty(t));
    expect(screen.queryByText('emptyWhatsapp')).toBeNull();
  });

  it('el contenedor se identifica para las pruebas E2E', () => {
    render(renderEmpty(t, null));
    expect(screen.getByTestId('empty-state')).toBeTruthy();
  });
});
