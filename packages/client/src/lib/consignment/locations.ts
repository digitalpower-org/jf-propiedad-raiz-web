// Ubicaciones del formulario de consignación (AC3.1.1, D9: departamento y municipio juntos).
// Mismos datos que usan hoy los filtros del catálogo (Filters.tsx); los nombres propios no se traducen.
// DEUDA: cuando Filters adopte este módulo, desaparece la duplicación.

export const DEPARTAMENTOS = [
  'Antioquia',
  'Cundinamarca',
  'Valle del Cauca',
  'Atlántico',
  'Santander',
  'Bolívar',
] as const;

export type Departamento = (typeof DEPARTAMENTOS)[number];

const MUNICIPIOS_POR_DEPARTAMENTO: Readonly<Record<Departamento, readonly string[]>> = {
  Antioquia: ['Medellín', 'Envigado', 'Itagüí', 'Bello', 'Sabaneta', 'Rionegro', 'Copacabana'],
  Cundinamarca: ['Bogotá', 'Soacha', 'Chía', 'Cajicá'],
  'Valle del Cauca': ['Cali', 'Palmira', 'Tuluá'],
  Atlántico: ['Barranquilla', 'Soledad'],
  Santander: ['Bucaramanga', 'Floridablanca'],
  Bolívar: ['Cartagena'],
};

export function municipiosDe(departamento: string): readonly string[] {
  return (DEPARTAMENTOS as readonly string[]).includes(departamento)
    ? MUNICIPIOS_POR_DEPARTAMENTO[departamento as Departamento]
    : [];
}
