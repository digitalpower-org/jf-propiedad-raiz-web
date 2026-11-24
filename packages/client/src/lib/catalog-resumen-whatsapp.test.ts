import { describe, expect, it, vi } from 'vitest';
import { mensajeSinResultados, urlWhatsAppSinResultados } from './catalog-resumen';

// AC2.2.10: sin número de WhatsApp configurado no hay enlace, y por tanto no hay botón.

type Parametros = { readonly number: string; readonly message: string };
const construirFalso = () =>
  vi.fn((p: Parametros) => `https://wa.me/${p.number}?text=${encodeURIComponent(p.message)}`);

describe('urlWhatsAppSinResultados | enlace del estado vacío', () => {
  it('sin número configurado no hay enlace y no se construye nada', () => {
    const construir = construirFalso();
    expect(urlWhatsAppSinResultados(null, 'casa', 'es', construir)).toBeNull();
    expect(construir).not.toHaveBeenCalled();
  });

  it('un número vacío tampoco genera enlace', () => {
    const construir = construirFalso();
    expect(urlWhatsAppSinResultados('', 'casa', 'es', construir)).toBeNull();
    expect(construir).not.toHaveBeenCalled();
  });

  it('con número construye la URL con el mensaje de los filtros', () => {
    const construir = construirFalso();
    const url = urlWhatsAppSinResultados('573001234567', 'casa, estrato 3', 'es', construir);
    const mensaje = mensajeSinResultados('casa, estrato 3', 'es');
    expect(construir).toHaveBeenCalledTimes(1);
    expect(construir).toHaveBeenCalledWith({ number: '573001234567', message: mensaje });
    expect(url).toBe(`https://wa.me/573001234567?text=${encodeURIComponent(mensaje)}`);
  });

  it('el mensaje sigue el idioma de la página', () => {
    const construir = construirFalso();
    urlWhatsAppSinResultados('573001234567', 'house', 'en', construir);
    expect(construir).toHaveBeenCalledWith({
      number: '573001234567',
      message: mensajeSinResultados('house', 'en'),
    });
  });
});
