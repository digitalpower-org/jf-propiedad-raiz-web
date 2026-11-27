// Plantillas HTML de los correos de consignación (US3.2).
// Reproduce las referencias de Google Stitch: paleta esmeralda/oro, tipografía
// Helvetica Neue + Georgia, contenedor de 600 px, logo por URL y tema light único.

import type { BackendSpec } from '@jf/shared-types';
import type { IdiomaCorreo, TextosCorreo } from './textos-consignacion';
import { LOGO_URL, LOGO_ALT, TEXTOS } from './textos-consignacion';

export type { IdiomaCorreo };

type ConsignmentInput = BackendSpec.components['schemas']['ConsignmentInput'];

const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

const ETIQUETA_NOTIF =
  'width:40%;padding:12px 0;border-bottom:1px solid #E6DEC8;font-size:13px;color:#5E6A63;font-weight:600';
const VALOR_NOTIF =
  'width:60%;text-align:right;padding:12px 0;border-bottom:1px solid #E6DEC8;font-size:14px;color:#042316;font-weight:600';
const ETIQUETA_INMUEBLE =
  'width:45%;padding:12px 0;border-bottom:1px solid #E6DEC8;font-size:13px;color:#5E6A63;font-weight:600';
const VALOR_INMUEBLE =
  'width:55%;text-align:right;padding:12px 0;border-bottom:1px solid #E6DEC8;font-size:14px;color:#042316;font-weight:600';
const VALOR_UBICACION =
  'width:55%;text-align:right;padding:12px 0;border-bottom:1px solid #E6DEC8;font-size:14px;color:#042316';
const VALOR_TIPO =
  'width:55%;text-align:right;padding:12px 0;border-bottom:1px solid #E6DEC8;font-size:14px;color:#042316;font-weight:700;letter-spacing:0.8px';
const ETIQUETA_RECIBO =
  'width:45%;padding:8px 0;border-bottom:1px solid #EFEAE0;font-size:13px;color:#5E6A63;font-weight:600';
const ETIQUETA_UBICACION_RECIBO =
  'width:45%;padding:10px 0 2px 0;font-size:13px;color:#5E6A63;font-weight:600';
const VALOR_TIPO_RECIBO =
  'width:55%;text-align:right;padding:8px 0;border-bottom:1px solid #EFEAE0;font-size:14px;color:#042316;font-weight:700;letter-spacing:0.6px';
const VALOR_UBICACION_RECIBO =
  'width:55%;text-align:right;padding:10px 0 2px 0;font-size:14px;color:#042316';

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fila(
  campo: string,
  etiqueta: string,
  valor: string,
  estiloLabel: string,
  estiloValor: string,
): string {
  return `<tr data-campo="${campo}"><td style="${estiloLabel}">${escapar(etiqueta)}</td><td style="${estiloValor}">${escapar(valor)}</td></tr>`;
}

function filaRecibo(
  campo: string,
  etiqueta: string,
  valor: string,
  estiloLabel: string,
  estiloValor: string,
): string {
  return `<tr data-campo="${campo}"><td class="stack-col" width="45%" style="${estiloLabel}">${escapar(etiqueta)}</td><td class="stack-col mobile-left" width="55%" align="right" style="${estiloValor}">${escapar(valor)}</td></tr>`;
}

function filaEnlace(
  campo: string,
  etiqueta: string,
  valor: string,
  href: string,
  estiloLabel: string,
  estiloValor: string,
): string {
  return `<tr data-campo="${campo}"><td style="${estiloLabel}">${escapar(etiqueta)}</td><td style="${estiloValor}"><a href="${escapar(href)}" style="color:#063823;text-decoration:none;font-weight:600;border-bottom:1px solid #C9A24D;">${escapar(valor)}</a></td></tr>`;
}

function filaOpcional(
  campo: string,
  etiqueta: string,
  valor: string | number | undefined,
  sufijo: string,
  estiloLabel: string,
  estiloValor: string,
): string {
  if (valor === undefined) return '';
  return fila(campo, etiqueta, `${valor}${sufijo}`, estiloLabel, estiloValor);
}

function mensajeWhatsApp(input: ConsignmentInput, t: TextosCorreo): string {
  return encodeURIComponent(t.whatsapp.replace('{nombre}', () => input.nombre));
}

function hrefWhatsApp(input: ConsignmentInput, t: TextosCorreo): string {
  const telefono = input.telefono.replace(/\D/g, '');
  return escapar(`https://wa.me/${telefono}?text=${mensajeWhatsApp(input, t)}`);
}

function filasPropietario(input: ConsignmentInput, t: TextosCorreo): string {
  return [
    fila('nombre', t.nombre, input.nombre, ETIQUETA_NOTIF, VALOR_NOTIF),
    filaEnlace(
      'telefono',
      t.telefono,
      input.telefono,
      `tel:${input.telefono}`,
      ETIQUETA_NOTIF,
      VALOR_NOTIF,
    ),
    filaEnlace(
      'email',
      t.correo,
      input.email,
      `mailto:${input.email}`,
      ETIQUETA_NOTIF,
      VALOR_NOTIF,
    ),
  ].join('');
}

function filasPropiedad(input: ConsignmentInput, t: TextosCorreo): string {
  const ubicacion = `${input.departamento}, ${input.municipio}`;
  return [
    fila('tipo', t.tipo, input.tipo, ETIQUETA_INMUEBLE, VALOR_TIPO),
    fila('ubicacion', t.ubicacion, ubicacion, ETIQUETA_INMUEBLE, VALOR_UBICACION),
    filaOpcional(
      'area-construida',
      t.areaConstruida,
      input.areaConstruida,
      ' m²',
      ETIQUETA_INMUEBLE,
      VALOR_INMUEBLE,
    ),
    filaOpcional('area-lote', t.areaLote, input.areaLote, ' m²', ETIQUETA_INMUEBLE, VALOR_INMUEBLE),
  ].join('');
}

function filasPropiedadRecibo(input: ConsignmentInput, t: TextosCorreo): string {
  const ubicacion = `${input.departamento}, ${input.municipio}`;
  return [
    filaRecibo('tipo', t.tipo, input.tipo, ETIQUETA_RECIBO, VALOR_TIPO_RECIBO),
    filaRecibo(
      'ubicacion',
      t.ubicacion,
      ubicacion,
      ETIQUETA_UBICACION_RECIBO,
      VALOR_UBICACION_RECIBO,
    ),
  ].join('');
}

function seccion(nombre: string, titulo: string, contenido: string, margen: string): string {
  return `<div data-seccion="${nombre}"><p style="margin:0 0 10px 0;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#9E7B2F;">${escapar(titulo)}</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:${margen};border-top:1px solid #C9A24D;"><tbody>${contenido}</tbody></table></div>`;
}

function introduccionNotificacion(t: TextosCorreo): string {
  const marca = `<strong style="color:#042316;">${escapar(LOGO_ALT)}</strong>`;
  return `${escapar(t.subtituloNotificacionInicio)}${marca}${escapar(t.subtituloNotificacionFin)}`;
}

function fechaBogota(idioma: IdiomaCorreo): string {
  return new Intl.DateTimeFormat(idioma === 'es' ? 'es-CO' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Bogota',
  }).format(new Date());
}

function cabecera(t: TextosCorreo, tipo: 'notificacion' | 'recibo'): string {
  const notificacion = tipo === 'notificacion';
  const logo = notificacion
    ? 'width="76" height="51" style="display:block;margin:0 auto 18px auto;width:76px;height:51px;border-radius:16px;"'
    : 'width="80" height="53" style="display:block;margin:0 auto 18px auto;width:80px;height:53px;border-radius:16px;"';
  const padding = notificacion ? 'padding:36px 32px 30px 32px;' : 'padding:38px 32px 32px 32px;';
  const eyebrow = notificacion ? t.encabezadoNotificacion : t.encabezadoRecibo;
  const titulo = notificacion ? t.tituloNotificacion : t.reciboTitulo;
  const tamano = notificacion ? 26 : 25;
  const tracking = notificacion ? 'letter-spacing:0.3px;' : '';
  return `<tr><td align="center" style="background-color:#042316;${padding}border-bottom:3px solid #C9A24D;"><img src="${LOGO_URL}" alt="${LOGO_ALT}" ${logo}><p style="margin:0 0 8px 0;font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#E2C478;">${escapar(eyebrow)}</p><h1 style="margin:0;font-family:${SERIF};font-size:${tamano}px;font-weight:normal;line-height:1.3;color:#FAF8F3;${tracking}">${escapar(titulo)}</h1></td></tr>`;
}

function bandaValor(valor: number | undefined, t: TextosCorreo): string {
  if (valor === undefined) return '';
  const monto = `$${new Intl.NumberFormat('es-CO').format(valor)}`;
  return `<tr><td data-campo="valor" class="mobile-pad" style="background-color:#072F1E;padding:18px 40px;border-bottom:1px solid #C9A24D;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tbody><tr><td class="stack-col" style="font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#D4B46A;">${escapar(t.valor)}</td><td class="stack-col mobile-left" align="right" style="font-family:${SERIF};font-size:24px;font-weight:normal;color:#FAF8F3;letter-spacing:0.5px;">${escapar(monto)}</td></tr></tbody></table></td></tr>`;
}

function cuerpoNotificacion(input: ConsignmentInput, t: TextosCorreo): string {
  const mensaje = input.mensaje
    ? `<p data-campo="mensaje" style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#4A554F;">${escapar(input.mensaje)}</p>`
    : '';
  const boton = `<a href="${hrefWhatsApp(input, t)}" style="display:inline-block;background-color:#042316;color:#E8CF88;font-family:${SANS};font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border:1px solid #C9A24D;border-radius:2px;">${escapar(t.contactar)}</a>`;
  return `<tr><td class="mobile-pad" style="padding:36px 40px 28px 40px;background-color:#FAF8F3;"><p style="margin:0 0 24px 0;font-family:${SANS};font-size:14px;line-height:1.6;color:#4A554F;">${introduccionNotificacion(t)}</p>${seccion('propietario', t.propietario, filasPropietario(input, t), '28px')}${seccion('propiedad', t.propiedad, filasPropiedad(input, t), '30px')}${mensaje}<div data-campo="whatsapp" align="center" style="padding-top:4px;">${boton}</div></td></tr>`;
}

function cuerpoRecibo(input: ConsignmentInput, t: TextosCorreo): string {
  const tarjeta = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #DFD5BC;border-left:4px solid #C9A24D;margin-bottom:28px;"><tbody><tr><td style="padding:22px 24px;"><p style="margin:0 0 14px 0;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#9E7B2F;">${escapar(t.resumenPropiedad)}</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tbody>${filasPropiedadRecibo(input, t)}</tbody></table></td></tr></tbody></table>`;
  return `<tr><td class="mobile-pad" style="padding:40px 44px 36px 44px;background-color:#FAF8F3;"><p data-campo="saludo" style="margin:0 0 18px 0;font-family:${SERIF};font-size:20px;color:#042316;">Hola ${escapar(input.nombre)},</p><p style="margin:0 0 28px 0;font-family:${SANS};font-size:15px;line-height:1.7;color:#3D4A43;">${escapar(t.confirmacion)}</p>${tarjeta}<p data-seccion="siguiente" style="margin:0;font-family:${SANS};font-size:13px;line-height:1.6;color:#5E6A63;">${escapar(t.notaResponder)}</p></td></tr>`;
}

function pieNotificacion(t: TextosCorreo, emailContacto: string): string {
  return `<tr data-seccion="pie"><td align="center" style="background-color:#F2EEE4;padding:20px 32px;border-top:1px solid #E6DEC8;"><p style="margin:0 0 4px 0;font-family:${SERIF};font-size:13px;color:#042316;">${escapar(t.pieNombre)}</p><p style="margin:0;font-family:${SANS};font-size:11px;color:#6E7A73;">${escapar(emailContacto)}</p></td></tr>`;
}

function pieRecibo(t: TextosCorreo, emailContacto: string): string {
  const pie = `${emailContacto} · ${t.pieReciboDetalle}`;
  return `<tr data-seccion="pie"><td align="center" style="background-color:#042316;padding:22px 32px;border-top:1px solid #C9A24D;"><p style="margin:0 0 4px 0;font-family:${SERIF};font-size:14px;color:#E2C478;letter-spacing:0.5px;">${escapar(t.pieReciboNombre)}</p><p style="margin:0;font-family:${SANS};font-size:11px;color:#B4C2BA;">${escapar(pie)}</p></td></tr>`;
}

function envolver(
  tipo: 'notificacion' | 'recibo',
  idioma: IdiomaCorreo,
  titulo: string,
  preheader: string,
  cabeceraHtml: string,
  cuerpoHtml: string,
  pieHtml: string,
): string {
  const apilado = tipo === 'notificacion' ? 12 : 8;
  return `<!DOCTYPE html><html lang="${idioma}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge"><title>${escapar(titulo)}</title><style type="text/css">body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none;}@media only screen and (max-width:620px){.email-container{width:100%!important;max-width:100%!important;}.mobile-pad{padding-left:22px!important;padding-right:22px!important;}.stack-col{display:block!important;width:100%!important;padding-bottom:${apilado}px!important;}.mobile-left{text-align:left!important;}}</style></head><body style="margin:0;padding:0;background-color:#EFECE6;font-family:${SANS};color:#1A241E;"><span style="display:none">${escapar(preheader)}</span><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EFECE6;"><tbody><tr><td align="center" style="padding:32px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" data-correo="${tipo}" data-idioma="${idioma}" style="width:600px;max-width:600px;background-color:#FAF8F3;border:1px solid #D9CEB2;border-radius:4px;overflow:hidden;"><tbody>${cabeceraHtml}${cuerpoHtml}${pieHtml}</tbody></table></td></tr></tbody></table></body></html>`;
}

export function construirHtmlNotificacion(
  input: ConsignmentInput,
  emailContacto: string,
  idioma: IdiomaCorreo = 'es',
): string {
  const t = TEXTOS[idioma];
  return envolver(
    'notificacion',
    idioma,
    t.tituloNotificacion,
    `${t.preheader} · ${fechaBogota(idioma)}`,
    cabecera(t, 'notificacion'),
    bandaValor(input.valor, t) + cuerpoNotificacion(input, t),
    pieNotificacion(t, emailContacto),
  );
}

export function construirHtmlRecibo(
  input: ConsignmentInput,
  emailContacto: string,
  idioma: IdiomaCorreo = 'es',
): string {
  const t = TEXTOS[idioma];
  return envolver(
    'recibo',
    idioma,
    t.reciboTitulo,
    t.preheader,
    cabecera(t, 'recibo'),
    cuerpoRecibo(input, t),
    pieRecibo(t, emailContacto),
  );
}
