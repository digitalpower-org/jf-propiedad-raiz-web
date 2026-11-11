import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./catalog-seed', () => ({
  seedCatalog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../infrastructure/config/env', () => ({
  loadEnv: vi.fn().mockReturnValue({
    internalKey: 'test-key-01234567890123456789012345678901',
    bffUrl: 'http://localhost:3000',
    firebaseProjectId: 'test-project',
    useFakeTranslator: true,
  }),
}));

vi.mock('../infrastructure/firebase/admin-app', () => ({
  getAdminApp: vi.fn().mockReturnValue({ name: 'test-app' }),
}));

vi.mock('../infrastructure/firebase/firestore', () => ({
  createFirestore: vi.fn().mockReturnValue({}),
}));

import { sampleData, seedFirestore } from './sample-data';
import { seedCatalog } from './catalog-seed';

let logSpy: ReturnType<typeof vi.spyOn>;

function loggedText(): string {
  return logSpy.mock.calls
    .map((args: unknown[]) => args.map((arg: unknown) => String(arg)).join(' '))
    .join('\n');
}

describe('sample-data (US6.1, MT1.5)', () => {
  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    vi.resetModules();
  });

  describe('sampleData', () => {
    it('provides the expected sample properties with stable payloads', () => {
      expect(sampleData.properties).toHaveLength(2);

      const [first, second] = sampleData.properties;
      expect(first).toMatchObject({
        codigo: 'JF-0001',
        slug: 'propiedad-en-ve-quinta',
        status: 'ACTIVE',
        operacion: 'VENTA',
        tipo: 'APARTAMENTO',
        titulo: 'Apartamento en Venta en Quinta',
        precio: 150_000_000,
        departamento: 'Medellín',
        municipio: 'Medellín',
        destacada: true,
        fotos: [],
        videos: [],
        panoramas: [],
        createdAt: '2024-01-15T00:00:00.000Z',
      });
      expect(second).toMatchObject({
        codigo: 'JF-0002',
        slug: 'casa-rural-con-jardin',
        status: 'ACTIVE',
        operacion: 'VENTA',
        tipo: 'CASA',
        titulo: 'Casa Rural con Jardín',
        precio: 320_000_000,
        municipio: 'Envigado',
        destacada: false,
        createdAt: '2024-02-20T00:00:00.000Z',
      });
      expect(first?.id).toMatch(/^[0-9a-z]{4,}$/);
      expect(second?.id).not.toBe(first?.id);
    });

    it('provides the expected sample services', () => {
      expect(sampleData.services).toHaveLength(2);
      expect(sampleData.services[0]).toMatchObject({
        slug: 'asesoria-legal',
        status: 'ACTIVE',
        titulo: 'Asesoría Legal',
        orden: 1,
        fotos: [],
      });
      expect(sampleData.services[1]).toMatchObject({
        slug: 'administracion',
        status: 'ACTIVE',
        titulo: 'Administración',
        orden: 2,
        fotos: [],
      });
    });

    it('provides the expected about document', () => {
      expect(sampleData.about.titulo).toBe('JF Propiedad Raíz');
      expect(sampleData.about.extracto).toBe(
        'Tu socio de confianza en transacciones inmobiliarias',
      );
      expect(sampleData.about.secciones.map((seccion) => seccion.titulo)).toEqual([
        'Nuestra Visión',
        'Nuestra Misión',
      ]);
      expect(sampleData.about.equipo).toHaveLength(1);
      expect(sampleData.about.equipo[0]).toMatchObject({
        nombre: 'Santiago González',
        cargo: 'Fundador y CEO',
      });
    });

    it('generates deterministic ids across module reloads', async () => {
      vi.resetModules();
      const reloaded = await import('./sample-data.js');

      expect(reloaded.sampleData.properties.map((property) => property.id)).toEqual(
        sampleData.properties.map((property) => property.id),
      );
      expect(reloaded.sampleData.services.map((service) => service.id)).toEqual(
        sampleData.services.map((service) => service.id),
      );
      expect(reloaded.sampleData.about.secciones.map((seccion) => seccion.id)).toEqual(
        sampleData.about.secciones.map((seccion) => seccion.id),
      );
      expect(reloaded.sampleData.about.equipo.map((integrante) => integrante.id)).toEqual(
        sampleData.about.equipo.map((integrante) => integrante.id),
      );
    });
  });

  describe('seedFirestore', () => {
    it('defaults to dry-run and reports the sample counts', async () => {
      await expect(seedFirestore()).resolves.toBeUndefined();

      const output = loggedText();
      expect(output).toContain('=== Seed de muestra (US6.1, MT1.5) ===');
      expect(output).toContain('Propiedades de muestra: 2');
      expect(output).toContain('Servicios de muestra: 2');
      expect(output).toContain('Documento About: 2 secciones, 1 integrantes');
      expect(output).toContain('Traductor: falso');
      expect(output).toContain('========================================');
    });

    it('runs the same dry-run path when dryRun is explicitly true', async () => {
      await seedFirestore(true);

      const output = loggedText();
      expect(output).toContain('Propiedades de muestra: 2');
      expect(output).not.toContain('Seed a Firestore no implementado aún');
    });

    it('llama a seedCatalog con dryRun=false cuando no es dry-run (MT2.4)', async () => {
      await expect(seedFirestore(false)).resolves.toBeUndefined();

      expect(seedCatalog).toHaveBeenCalledTimes(1);
      expect(seedCatalog).toHaveBeenCalledWith(expect.anything(), false);

      const output = loggedText();
      expect(output).not.toContain('Seed a Firestore no implementado aún');
      expect(output).not.toContain('=== Seed de muestra (US6.1, MT1.5) ===');
    });
  });
});
