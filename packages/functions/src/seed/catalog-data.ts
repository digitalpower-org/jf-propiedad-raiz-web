/**
 * Datos únicos del catálogo de ejemplo (US6.1, MT2.4).
 *
 * Fuente única de verdad para los datos de ejemplo del catálogo:
 * 20 inmuebles, 3 servicios y documento Nosotros. Usado por:
 * - `catalog-seed.ts` para persistencia real en Firestore (MT2.4)
 * - `sample-data.ts` para andamiaje de muestra (MT1.5)
 *
 * No hay datos de personas reales, direcciones ni teléfonos reales (AC6.1.4).
 * No se invoca al proveedor real de traducción (AC0.5.9 / AC6.1.4).
 */

import type { CrearPropertyInputDto } from '../application/ports/properties-repository';
import type { Operacion, TipoInmueble, Translatable } from '@jf/shared-types';

const ahora = new Date();
const haceDias = (dias: number): string => {
  const fecha = new Date(ahora);
  fecha.setDate(fecha.getDate() - dias);
  return fecha.toISOString();
};

/** Datos de ejemplo de inmuebles (hasta 20, AC6.1.2). */
export const propiedadesCatalogo: readonly CrearPropertyInputDto[] = [
  {
    operacion: 'VENTA' as Operacion,
    tipo: 'APARTAMENTO' as TipoInmueble,
    titulo: { es: 'Apartamento en Venta en Quinta', en: 'Apartment for Sale in Quinta' },
    descripcion: {
      es: 'Apartamento en Venta en Quinta con acabados modernos',
      en: 'Apartment for sale in Quinta with modern finishes',
    },
    precio: 150_000_000,
    departamento: 'Medellín',
    municipio: 'Medellín',
    estrato: 3,
    acabados: { es: 'Acabados modernos', en: 'Modern finishes' },
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
  },
  {
    operacion: 'VENTA' as Operacion,
    tipo: 'CASA' as TipoInmueble,
    titulo: { es: 'Casa Campestre con Jardín' },
    descripcion: { es: 'Casa Campestre con Jardín y áreas verdes' },
    precio: 320_000_000,
    departamento: 'Medellín',
    municipio: 'Envigado',
    estrato: 4,
    acabados: { es: 'Rústico' },
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
  },
  {
    operacion: 'VENTA' as Operacion,
    tipo: 'APARTAMENTO' as TipoInmueble,
    titulo: { es: 'Apartamento en El Poblado', en: 'Apartment in El Poblado' },
    descripcion: {
      es: 'Apartamento lujoso en El Poblado con vista al parque',
      en: 'Luxury apartment in El Poblado with park view',
    },
    precio: 450_000_000,
    departamento: 'Medellín',
    municipio: 'Medellín',
    estrato: 5,
    acabados: { es: 'Premium', en: 'Premium' },
    antiguedad: '2022',
    areaConstruida: 110,
    areaLote: 150,
    dormitorios: 3,
    banos: 3,
    parqueaderos: 2,
    destacada: false,
    fotos: [],
    videos: [],
    panoramas: [],
  },
  {
    operacion: 'VENTA' as Operacion,
    tipo: 'FINCA' as TipoInmueble,
    titulo: { es: 'Finca en Rionegro' },
    descripcion: {
      es: 'Finca amplia en Rionegro con zona de camping',
      en: 'Large farm in Rionegro with camping area',
    },
    precio: 650_000_000,
    departamento: 'Medellín',
    municipio: 'Rionegro',
    estrato: 3,
    acabados: { es: 'Campestre' },
    antiguedad: '2015',
    areaConstruida: 350,
    areaLote: 5000,
    dormitorios: 5,
    banos: 4,
    parqueaderos: 4,
    destacada: false,
    fotos: [],
    videos: [],
    panoramas: [],
  },
  {
    operacion: 'VENTA' as Operacion,
    tipo: 'APARTAMENTO' as TipoInmueble,
    titulo: { es: 'Apartamento en Belén', en: 'Apartment in Belén' },
    descripcion: { es: 'Apartamento cómodo en Belén cerca del centro comercial' },
    precio: 180_000_000,
    departamento: 'Medellín',
    municipio: 'Medellín',
    estrato: 3,
    acabados: { es: 'Estándar', en: 'Standard' },
    antiguedad: '2019',
    areaConstruida: 75,
    areaLote: 100,
    dormitorios: 2,
    banos: 2,
    parqueaderos: 1,
    destacada: false,
    fotos: [],
    videos: [],
    panoramas: [],
  },
  {
    operacion: 'VENTA' as Operacion,
    tipo: 'APARTAMENTO' as TipoInmueble,
    titulo: { es: 'Apartamento en Laureles', en: 'Apartment in Laureles' },
    descripcion: {
      es: 'Apartamento moderno en Laureles cerca del parque',
      en: 'Modern apartment in Laureles near the park',
    },
    precio: 290_000_000,
    departamento: 'Medellín',
    municipio: 'Medellín',
    estrato: 4,
    acabados: { es: 'Moderno', en: 'Modern' },
    antiguedad: '2021',
    areaConstruida: 95,
    areaLote: 130,
    dormitorios: 3,
    banos: 2,
    parqueaderos: 1,
    destacada: false,
    fotos: [],
    videos: [],
    panoramas: [],
  },
  {
    operacion: 'VENTA' as Operacion,
    tipo: 'CASA' as TipoInmueble,
    titulo: { es: 'Casa en Sabaneda' },
    descripcion: {
      es: 'Casa familiar en Sabaneda con patio amplio',
      en: 'Family house in Sabaneda with large backyard',
    },
    precio: 380_000_000,
    departamento: 'Medellín',
    municipio: 'Sabaneta',
    estrato: 4,
    acabados: { es: 'Estándar' },
    antiguedad: '2017',
    areaConstruida: 160,
    areaLote: 250,
    dormitorios: 4,
    banos: 3,
    parqueaderos: 2,
    destacada: false,
    fotos: [],
    videos: [],
    panoramas: [],
  },
  {
    operacion: 'VENTA' as Operacion,
    tipo: 'APARTAMENTO' as TipoInmueble,
    titulo: { es: 'Apartamento en Itagüí', en: 'Apartment in Itagüí' },
    descripcion: {
      es: 'Apartamento céntrico en Itagüí con fácil acceso',
      en: 'Central apartment in Itagüí with easy access',
    },
    precio: 210_000_000,
    departamento: 'Medellín',
    municipio: 'Itagüí',
    estrato: 3,
    acabados: { es: 'Estándar', en: 'Standard' },
    antiguedad: '2020',
    areaConstruida: 80,
    areaLote: 110,
    dormitorios: 2,
    banos: 2,
    parqueaderos: 1,
    destacada: false,
    fotos: [],
    videos: [],
    panoramas: [],
  },
  {
    operacion: 'VENTA' as Operacion,
    tipo: 'APARTAMENTO' as TipoInmueble,
    titulo: { es: 'Apartamento en Envigado', en: 'Apartment in Envigado' },
    descripcion: {
      es: 'Apartamento tranquilo en Envigado zona residencial',
      en: 'Quiet apartment in Envigado residential area',
    },
    precio: 260_000_000,
    departamento: 'Medellín',
    municipio: 'Envigado',
    estrato: 4,
    acabados: { es: 'Moderno', en: 'Modern' },
    antiguedad: '2020',
    areaConstruida: 100,
    areaLote: 140,
    dormitorios: 3,
    banos: 2,
    parqueaderos: 1,
    destacada: false,
    fotos: [],
    videos: [],
    panoramas: [],
  },
  {
    operacion: 'VENTA' as Operacion,
    tipo: 'CASA' as TipoInmueble,
    titulo: { es: 'Casa en El Retiro' },
    descripcion: {
      es: 'Casa campestre en El Retiro con zona de recreación',
      en: 'Country house in El Retiro with recreation area',
    },
    precio: 420_000_000,
    departamento: 'Medellín',
    municipio: 'El Retiro',
    estrato: 3,
    acabados: { es: 'Campestre' },
    antiguedad: '2016',
    areaConstruida: 220,
    areaLote: 800,
    dormitorios: 4,
    banos: 3,
    parqueaderos: 3,
    destacada: false,
    fotos: [],
    videos: [],
    panoramas: [],
  },
  {
    operacion: 'VENTA' as Operacion,
    tipo: 'LOTE_URBANO' as TipoInmueble,
    titulo: { es: 'Lote Urbano en Copacabana', en: 'Urban Lot in Copacabana' },
    descripcion: {
      es: 'Lote urbano en Copacabana para construir vivienda',
      en: 'Urban lot in Copacabana to build housing',
    },
    precio: 120_000_000,
    departamento: 'Medellín',
    municipio: 'Copacabana',
    areaLote: 300,
    destacada: false,
    fotos: [],
    videos: [],
    panoramas: [],
  },
  {
    operacion: 'VENTA' as Operacion,
    tipo: 'APARTAMENTO' as TipoInmueble,
    titulo: { es: 'Apartamento Premium en El Poblado', en: 'Premium Apartment in El Poblado' },
    descripcion: {
      es: 'Apartamento premium en El Poblado con todas las comodidades',
      en: 'Premium apartment in El Poblado with all amenities',
    },
    precio: 520_000_000,
    departamento: 'Medellín',
    municipio: 'Medellín',
    estrato: 5,
    acabados: { es: 'Premium', en: 'Premium' },
    antiguedad: '2023',
    areaConstruida: 140,
    areaLote: 180,
    dormitorios: 3,
    banos: 3,
    parqueaderos: 2,
    destacada: false,
    fotos: [],
    videos: [],
    panoramas: [],
  },
  {
    operacion: 'VENTA' as Operacion,
    tipo: 'CASA' as TipoInmueble,
    titulo: { es: 'Casa en La Estrella' },
    descripcion: {
      es: 'Casa familiar en La Estrella con jardín privado',
      en: 'Family house in La Estrella with private garden',
    },
    precio: 340_000_000,
    departamento: 'Medellín',
    municipio: 'La Estrella',
    estrato: 4,
    acabados: { es: 'Estándar' },
    antiguedad: '2019',
    areaConstruida: 170,
    areaLote: 280,
    dormitorios: 4,
    banos: 3,
    parqueaderos: 2,
    destacada: false,
    fotos: [],
    videos: [],
    panoramas: [],
  },
  // 15. ALQUILER - Apartamento en arriendo
  {
    operacion: 'ALQUILER' as Operacion,
    tipo: 'APARTAMENTO' as TipoInmueble,
    titulo: { es: 'Apartamento en Arriendo', en: 'Apartment for Rent' },
    descripcion: {
      es: 'Apartamento disponible para arriendo en zona céntrica',
      en: 'Apartment available for rent in central area',
    },
    precio: 1_200_000,
    departamento: 'Medellín',
    municipio: 'Medellín',
    estrato: 3,
    acabados: { es: 'Estándar', en: 'Standard' },
    antiguedad: '2020',
    areaConstruida: 70,
    areaLote: 90,
    dormitorios: 2,
    banos: 1,
    parqueaderos: 1,
    destacada: false,
    fotos: [],
    videos: [],
    panoramas: [],
  },
  // 16. ALQUILER - Casa en arriendo
  {
    operacion: 'ALQUILER' as Operacion,
    tipo: 'CASA' as TipoInmueble,
    titulo: { es: 'Casa en Arriendo', en: 'House for Rent' },
    descripcion: {
      es: 'Casa amplia disponible para arriendo en barrio residencial',
      en: 'Large house available for rent in residential neighborhood',
    },
    precio: 1_800_000,
    departamento: 'Medellín',
    municipio: 'Envigado',
    estrato: 4,
    acabados: { es: 'Estándar' },
    antiguedad: '2018',
    areaConstruida: 150,
    areaLote: 220,
    dormitorios: 3,
    banos: 2,
    parqueaderos: 2,
    destacada: false,
    fotos: [],
    videos: [],
    panoramas: [],
  },
  // 17. PROYECTO_SOBRE_PLANOS
  {
    operacion: 'PROYECTO_SOBRE_PLANOS' as Operacion,
    tipo: 'APARTAMENTO' as TipoInmueble,
    titulo: { es: 'Proyecto Residencial Verde', en: 'Green Residential Project' },
    descripcion: {
      es: 'Proyecto residencial sobre planos en El Poblado con entrega estimada',
      en: 'Residential project off-plan in El Poblado with estimated delivery',
    },
    precio: 350_000_000,
    departamento: 'Medellín',
    municipio: 'Medellín',
    estrato: 4,
    acabados: { es: 'Premium', en: 'Premium' },
    antiguedad: '2024',
    areaConstruida: 90,
    areaLote: 120,
    dormitorios: 2,
    banos: 2,
    parqueaderos: 1,
    destacada: false,
    fotos: [],
    videos: [],
    panoramas: [],
    proyecto: {
      etapa: { es: 'Lanzamiento', en: 'Launch' },
      fechaEntregaEstimada: '2026-12',
      unidadesDisponibles: 15,
    },
  },
  // 18. HIDDEN - Inmueble oculto (AC6.1.3)
  {
    operacion: 'VENTA' as Operacion,
    tipo: 'APARTAMENTO' as TipoInmueble,
    titulo: { es: 'Apartamento Oculto' },
    descripcion: { es: 'Apartamento oculto del catálogo público' },
    precio: 200_000_000,
    departamento: 'Medellín',
    municipio: 'Medellín',
    estrato: 3,
    acabados: { es: 'Estándar' },
    antiguedad: '2019',
    areaConstruida: 75,
    areaLote: 100,
    dormitorios: 2,
    banos: 1,
    parqueaderos: 1,
    destacada: false,
    fotos: [],
    videos: [],
    panoramas: [],
  },
  // 19. VENTA - Apartamento en Sabaneta
  {
    operacion: 'VENTA' as Operacion,
    tipo: 'APARTAMENTO' as TipoInmueble,
    titulo: { es: 'Apartamento en Sabaneta', en: 'Apartment in Sabaneta' },
    descripcion: {
      es: 'Apartamento moderno en Sabaneta cerca del transporte',
      en: 'Modern apartment in Sabaneta near public transport',
    },
    precio: 230_000_000,
    departamento: 'Medellín',
    municipio: 'Sabaneta',
    estrato: 3,
    acabados: { es: 'Moderno', en: 'Modern' },
    antiguedad: '2020',
    areaConstruida: 85,
    areaLote: 120,
    dormitorios: 2,
    banos: 2,
    parqueaderos: 1,
    destacada: false,
    fotos: [],
    videos: [],
    panoramas: [],
  },
  // 20. VENTA - Casa en Rionegro
  {
    operacion: 'VENTA' as Operacion,
    tipo: 'CASA' as TipoInmueble,
    titulo: { es: 'Casa en Rionegro' },
    descripcion: {
      es: 'Casa espaciosa en Rionegro con zona social',
      en: 'Spacious house in Rionegro with social area',
    },
    precio: 410_000_000,
    departamento: 'Medellín',
    municipio: 'Rionegro',
    estrato: 4,
    acabados: { es: 'Estándar' },
    antiguedad: '2017',
    areaConstruida: 190,
    areaLote: 400,
    dormitorios: 4,
    banos: 3,
    parqueaderos: 2,
    destacada: false,
    fotos: [],
    videos: [],
    panoramas: [],
  },
  // adicional: apartamento en Copacabana (completa los 20 requeridos por AC6.1.2)
  {
    operacion: 'VENTA' as Operacion,
    tipo: 'APARTAMENTO' as TipoInmueble,
    titulo: { es: 'Apartamento en Copacabana', en: 'Apartment in Copacabana' },
    descripcion: {
      es: 'Apartamento familiar en Copacabana con buenas vías de acceso',
      en: 'Family apartment in Copacabana with good access roads',
    },
    precio: 240_000_000,
    departamento: 'Medellín',
    municipio: 'Copacabana',
    estrato: 3,
    acabados: { es: 'Estándar', en: 'Standard' },
    antiguedad: '2019',
    areaConstruida: 90,
    areaLote: 130,
    dormitorios: 3,
    banos: 2,
    parqueaderos: 1,
    destacada: false,
    fotos: [],
    videos: [],
    panoramas: [],
  },
];

/** Servicios de ejemplo (algunos activos, algunos ocultos). */
export const serviciosCatalogo: readonly {
  readonly slug: string;
  readonly status: 'ACTIVE' | 'HIDDEN' | 'DELETED';
  readonly titulo: Translatable;
  readonly resumen: Translatable;
  readonly cuerpo: Translatable;
  readonly orden: number;
  readonly fotos: readonly unknown[];
  readonly updatedAt: string;
}[] = [
  {
    slug: 'asesoria-legal',
    status: 'ACTIVE',
    titulo: { es: 'Asesoría Legal', en: 'Legal Advisory' },
    resumen: {
      es: 'Asesoría legal integral para operaciones inmobiliarias',
      en: 'Comprehensive legal advisory for real estate operations',
    },
    cuerpo: {
      es: 'Nuestro equipo de abogados especializados en derecho inmobiliario le acompaña en cada etapa de la compraventa o arrendamiento.',
      en: 'Our team of real estate law specialists accompanies you at every stage of purchase or lease.',
    },
    orden: 1,
    fotos: [],
    updatedAt: ahora.toISOString(),
  },
  {
    slug: 'administracion',
    status: 'ACTIVE',
    titulo: { es: 'Administración de Propiedades', en: 'Property Management' },
    resumen: {
      es: 'Servicios de administración y mantenimiento de propiedades',
      en: 'Property administration and maintenance services',
    },
    cuerpo: {
      es: 'Gestionamos su propiedad con transparencia y velocidad, desde el alquiler hasta el mantenimiento.',
      en: 'We manage your property with transparency and speed, from lease to maintenance.',
    },
    orden: 2,
    fotos: [],
    updatedAt: ahora.toISOString(),
  },
  {
    slug: 'tasacion-inmobiliaria',
    status: 'HIDDEN',
    titulo: { es: 'Tasación Inmobiliaria', en: 'Real Estate Appraisal' },
    resumen: {
      es: 'Valoración profesional de inmuebles para compra, venta o garantía',
      en: 'Professional valuation of real estate for purchase, sale or collateral',
    },
    cuerpo: {
      es: 'Determinamos el valor comercial de su inmueble con criterios técnicos y de mercado actualizado.',
      en: 'We determine the commercial value of your property with technical and current market criteria.',
    },
    orden: 3,
    fotos: [],
    updatedAt: ahora.toISOString(),
  },
];

/** Documento Nosotros de ejemplo. */
export const aboutCatalogo = {
  titulo: { es: 'JF Propiedad Raíz', en: 'JF Real Estate' },
  extracto: {
    es: 'Tu socio de confianza en transacciones inmobiliarias',
    en: 'Your trusted partner in real estate transactions',
  },
  secciones: [
    {
      id: 'seccion-vision',
      titulo: { es: 'Nuestra Visión', en: 'Our Vision' },
      cuerpo: {
        es: 'Ser la plataforma más confiable para la transacción de propiedades en Colombia',
        en: 'To be the most trusted platform for property transactions in Colombia',
      },
    },
    {
      id: 'seccion-mision',
      titulo: { es: 'Nuestra Misión', en: 'Our Mission' },
      cuerpo: {
        es: 'Facilitar la compra, venta y administración de propiedades con transparencia y velocidad',
        en: 'Facilitate the purchase, sale and administration of properties with transparency and speed',
      },
    },
  ],
  equipo: [
    {
      id: 'integrante-1',
      nombre: 'Santiago González',
      cargo: { es: 'Fundador y CEO', en: 'Founder and CEO' },
      descripcion: {
        es: 'Experto en inmobiliaria con 15 años de experiencia',
        en: 'Real estate expert with 15 years of experience',
      },
    },
    {
      id: 'integrante-2',
      nombre: 'María Rodríguez',
      cargo: { es: 'Gerente Comercial', en: 'Commercial Manager' },
      descripcion: {
        es: 'Especialista en atención al cliente y negociación',
        en: 'Customer service and negotiation specialist',
      },
    },
  ],
  updatedAt: ahora.toISOString(),
};

/** Fecha de creación escalonada para cada propiedad (algunas recientes = "Nuevo"). */
export const fechasCreacionCatalogo: readonly string[] = [
  haceDias(5), // JF-0001 (Nuevo, destacada)
  haceDias(45), // JF-0002
  haceDias(10), // JF-0003 (Nuevo)
  haceDias(60), // JF-0004
  haceDias(20), // JF-0005 (Nuevo)
  haceDias(15), // JF-0006 (Nuevo)
  haceDias(90), // JF-0007
  haceDias(30), // JF-0008 (límite Nuevo, no es nuevo)
  haceDias(12), // JF-0009 (Nuevo)
  haceDias(100), // JF-0010
  haceDias(25), // JF-0011 (Nuevo)
  haceDias(8), // JF-0012 (Nuevo)
  haceDias(50), // JF-0013
  haceDias(20), // JF-0014 (alquiler)
  haceDias(40), // JF-0015 (alquiler)
  haceDias(30), // JF-0016 (proyecto)
  haceDias(15), // JF-0017 (HIDDEN)
  haceDias(18), // JF-0018
  haceDias(35), // JF-0019
  haceDias(55), // JF-0020
];

/** Códigos secuenciales fijos para idempotencia (D6). */
export const codigosSecuencialesCatalogo: readonly string[] = [
  'JF-0001',
  'JF-0002',
  'JF-0003',
  'JF-0004',
  'JF-0005',
  'JF-0006',
  'JF-0007',
  'JF-0008',
  'JF-0009',
  'JF-0010',
  'JF-0011',
  'JF-0012',
  'JF-0013',
  'JF-0014',
  'JF-0015',
  'JF-0016',
  'JF-0017',
  'JF-0018',
  'JF-0019',
  'JF-0020',
];
