// Textos de los correos de consignación (US3.2).
// Copy del notificacion y del recibo, en español e inglés, siguiendo la
// estructura de las referencias de Google Stitch.

export type IdiomaCorreo = 'es' | 'en';

export const LOGO_URL = 'https://drive.google.com/uc?id=1bbD-MFaSaQ25OAqI3BGe9DkIXEcYyP4r';
export const LOGO_ALT = 'JF Propiedad Raíz';

export const TEXTOS = {
  es: {
    preheader: 'Solicitud de consignación recibida',
    marca: 'JF PROPIEDAD RAÍZ',
    lema: 'CONSIGNE SU PROPIEDAD',
    tituloNotificacion: 'Nueva solicitud de consignación',
    subtituloNotificacionInicio:
      'Se ha registrado una nueva solicitud de consignación de propiedad a través del portal de ',
    subtituloNotificacionFin: '. A continuación, el detalle completo del prospecto y del inmueble:',
    encabezadoNotificacion: 'Notificación Interna · Consignaciones',
    encabezadoRecibo: 'Confirmación de Recepción',
    propietario: 'Datos del Propietario',
    propiedad: 'Especificaciones del Inmueble',
    nombre: 'Nombre',
    telefono: 'Teléfono',
    correo: 'Email',
    idioma: 'Idioma',
    tipo: 'Tipo de inmueble',
    ubicacion: 'Ubicación',
    valor: 'Valor solicitado',
    areaConstruida: 'Área construida',
    areaLote: 'Área de lote',
    contactar: 'Contactar Propietario',
    contactarDetalle: 'Responde sin salir de tu bandeja o abre el chat directo.',
    pieNombre: 'JF Propiedad Raíz · División de Consignaciones',
    pieReciboDetalle: 'Atención Exclusiva',
    hola: 'Hola',
    confirmacion:
      'Hemos recibido tu solicitud para consignar tu propiedad. Nuestro equipo especializado ya se encuentra revisando los detalles y nos comunicaremos contigo pronto para brindarte una atención personalizada.',
    siguiente: '¿Qué sigue?',
    paso1: 'Revisamos la información que nos enviaste.',
    paso2: 'Te contactamos para confirmar los detalles.',
    paso3: 'Coordinamos la visita y la evaluación del inmueble.',
    whatsapp: 'Hola {nombre}, vi tu solicitud de consignación de propiedad. Quisiera más detalles.',
    reciboTitulo: 'Recibo de tu solicitud de consignación',
    reciboSubtitulo: 'Queremos confirmarte que ya recibimos tu solicitud.',
    resumenPropiedad: 'Resumen de la Propiedad Registrada',
    notaResponder:
      'Si deseas agregar información adicional o fotografías de tu inmueble, puedes responder directamente a este correo.',
    pieReciboNombre: 'JF Propiedad Raíz',
  },
  en: {
    preheader: 'Consignment request received',
    marca: 'JF PROPIEDAD RAÍZ',
    lema: 'LIST YOUR PROPERTY',
    tituloNotificacion: 'New consignment request',
    subtituloNotificacionInicio:
      'A new property consignment request has been registered through the ',
    subtituloNotificacionFin:
      ' portal. Below is the complete details of the prospect and the property:',
    encabezadoNotificacion: 'Internal Notification · Consignments',
    encabezadoRecibo: 'Receipt Confirmation',
    propietario: 'Owner Details',
    propiedad: 'Property Specifications',
    nombre: 'Name',
    telefono: 'Phone',
    correo: 'Email',
    idioma: 'Language',
    tipo: 'Property type',
    ubicacion: 'Location',
    valor: 'Asking price',
    areaConstruida: 'Built area',
    areaLote: 'Lot area',
    contactar: 'Contact Owner',
    contactarDetalle: 'Reply from your inbox or open the direct chat.',
    pieNombre: 'JF Propiedad Raíz · Consignment Division',
    pieReciboDetalle: 'Exclusive Attention',
    hola: 'Hello',
    confirmacion:
      'We received your request to list your property. Our specialized team is already reviewing the details and will contact you shortly to provide you with personalized attention.',
    siguiente: 'What happens next?',
    paso1: 'We review the information you sent.',
    paso2: 'We contact you to confirm the details.',
    paso3: 'We schedule the visit and property assessment.',
    whatsapp: 'Hello {nombre}, I saw your property listing request. I would like more details.',
    reciboTitulo: 'Receipt of your request',
    reciboSubtitulo: 'We would like to confirm that we received your request.',
    resumenPropiedad: 'Summary of the Registered Property',
    notaResponder:
      'If you wish to add additional information or photographs of your property, you can reply directly to this email.',
    pieReciboNombre: 'JF Propiedad Raíz',
  },
} as const;

export type TextosCorreo = (typeof TEXTOS)[IdiomaCorreo];
