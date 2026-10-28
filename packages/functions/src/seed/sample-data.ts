/**
 * Sample Data Seed (US6.1, MT1.5)
 *
 * Andamiaje de datos de ejemplo reproducibles para MT1.5 ("Operación base y despliegue temprano").
 * Genera datos de muestra usando modelos compartidos.
 * No invoca al proveedor real de traducción.
 *
 * NOTAS CLAVE:
 * - El seed de catálogo completo (inmuebles + servicios + Nosotros) no vive en MT1.5:
 *   depende del dominio y se ubica tras MT2.2 (ver MT2.4). Este archivo entrega solo el andamiaje
 *   temprano que reutiliza el esqueleto de MT0.5.
 */

// Helper: generar ID secuencial fijo (para reproducibilidad)
function id(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) | char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).padStart(4, '0');
}

// Datos de muestra: Inmuebles
const sampleProperties = [
  {
    id: id('prop-1'),
    codigo: 'JF-0001',
    slug: 'propiedad-en-ve-quinta',
    status: 'ACTIVE',
    operacion: 'VENTA',
    tipo: 'APARTAMENTO',
    titulo: 'Apartamento en Venta en Quinta',
    descripcion: 'Apartamento en Venta en Quinta con acabados modernos',
    precio: 150000000,
    departamento: 'Medellín',
    municipio: 'Medellín',
    estrato: 3,
    acabados: 'Acabados modernos',
    antiguedad: '2020',
    areaConstruida: 85,
    areaLote: 120,
    dormitorios: 2,
    banos: 2,
    parqueaderos: 1,
    destacada: true,
    fotos: [],
    videos: [],
    panoramas: [],
    createdAt: new Date('2024-01-15').toISOString(),
    updatedAt: new Date('2024-01-15').toISOString(),
  },
  {
    id: id('prop-2'),
    codigo: 'JF-0002',
    slug: 'casa-rural-con-jardin',
    status: 'ACTIVE',
    operacion: 'VENTA',
    tipo: 'CASA',
    titulo: 'Casa Rural con Jardín',
    descripcion: 'Casa Rural con Jardín y áreas verdes',
    precio: 320000000,
    departamento: 'Medellín',
    municipio: 'Envigado',
    estrato: 4,
    acabados: 'Rústico',
    antiguedad: '2018',
    areaConstruida: 180,
    areaLote: 500,
    dormitorios: 3,
    banos: 2,
    parqueaderos: 2,
    destacada: false,
    fotos: [],
    videos: [],
    panoramas: [],
    createdAt: new Date('2024-02-20').toISOString(),
    updatedAt: new Date('2024-02-20').toISOString,
  },
];

// Datos de muestra: Servicios
const sampleServices = [
  {
    id: id('serv-1'),
    slug: 'asesoria-legal',
    status: 'ACTIVE',
    titulo: 'Asesoría Legal',
    cuerpo: 'Asesoría legal integral para operaciones inmobiliarias',
    orden: 1,
    fotos: [],
    updatedAt: new Date('2024-01-15').toISOString,
  },
  {
    id: id('serv-2'),
    slug: 'administracion',
    status: 'ACTIVE',
    titulo: 'Administración',
    cuerpo: 'Servicios de administración y mantenimiento de propiedades',
    orden: 2,
    fotos: [],
    updatedAt: new Date('2024-01-15').toISOString,
  },
];

// Datos de muestra: About (Nosotros)
const sampleAboutSecciones = [
  {
    id: id('about-1'),
    titulo: 'Nuestra Visión',
    cuerpo: 'Ser la plataforma más confiable para la transacción de propiedades en Colombia',
  },
  {
    id: id('about-2'),
    titulo: 'Nuestra Misión',
    cuerpo:
      'Facilitar la compra, venta y administración de propiedades con transparencia y velocidad',
  },
];

const sampleIntegrantes = [
  {
    id: id('about-3'),
    nombre: 'Santiago González',
    cargo: 'Fundador y CEO',
    descripcion: 'Experto en inmobiliaria con 15 años de experiencia',
  },
];

const sampleAbout = {
  titulo: 'JF Propiedad Raíz',
  extracto: 'Tu socio de confianza en transacciones inmobiliarias',
  secciones: sampleAboutSecciones,
  equipo: sampleIntegrantes,
  updatedAt: new Date('2024-01-15').toISOString,
};

// Export sample data
export const sampleData = {
  properties: sampleProperties,
  services: sampleServices,
  about: sampleAbout,
} as const;

// Seed function for Firestore (dry-run: no side effects by default)
export async function seedFirestore(dryRun: boolean = true): Promise<void> {
  if (!dryRun) {
    // TODO: Implementar Firestore seed cuando el dominio esté disponible (MT2.4)
    console.log('Seed a Firestore no implementado aún - espera a MT2.4');
    return;
  }

  console.log('=== Seed de muestra (US6.1, MT1.5) ===');
  console.log('Propiedades de muestra:', sampleProperties.length);
  console.log('Servicios de muestra:', sampleServices.length);
  console.log(
    'Documento About:',
    sampleAbout.secciones.length,
    'secciones,',
    sampleAbout.equipo.length,
    'integrantes',
  );
  console.log('Traductor: falso (AC0.5.9 / US0.5/MT1.4) - no hay costo ni credenciales reales');
  console.log('========================================');
}
