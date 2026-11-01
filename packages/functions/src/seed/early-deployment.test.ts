import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { seedFirestoreMock, isWithinFreeTierMock, sampleDataFixture } = vi.hoisted(() => {
  const sampleDataFixture = {
    properties: [
      { id: 'p1', codigo: 'JF-0001' },
      { id: 'p2', codigo: 'JF-0002' },
    ],
    services: [{ id: 's1', slug: 'asesoria-legal' }],
    about: {
      titulo: 'JF Propiedad Raíz',
      extracto: 'Tu socio de confianza',
      secciones: [{ id: 'a1' }],
      equipo: [{ id: 'e1' }],
      updatedAt: '2024-01-15T00:00:00.000Z',
    },
  };

  return {
    sampleDataFixture,
    seedFirestoreMock: vi.fn(),
    isWithinFreeTierMock: vi.fn(),
  };
});

vi.mock('./sample-data', () => ({
  sampleData: sampleDataFixture,
  seedFirestore: seedFirestoreMock,
}));

vi.mock('../budget-config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../budget-config')>();
  return { ...actual, isWithinFreeTier: isWithinFreeTierMock };
});

import {
  BILLABLE_SERVICES,
  BUDGET_ALERT,
  ESTIMATED_MONTHLY_COST,
  R2,
  RESEND,
} from '../budget-config';
import { EARLY_DEPLOYMENT, initializeEarlyDeployment } from './early-deployment';

let logSpy: ReturnType<typeof vi.spyOn>;

function loggedText(): string {
  return logSpy.mock.calls
    .map((args: unknown[]) => args.map((arg: unknown) => String(arg)).join(' '))
    .join('\n');
}

describe('early-deployment (US6.3, MT1.5)', () => {
  beforeEach(() => {
    seedFirestoreMock.mockReset();
    seedFirestoreMock.mockResolvedValue(undefined);
    isWithinFreeTierMock.mockReset();
    isWithinFreeTierMock.mockReturnValue(true);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  describe('EARLY_DEPLOYMENT configuration', () => {
    it('reuses the sample data, budget and route configuration', () => {
      expect(EARLY_DEPLOYMENT.budgetThresholdUsd).toBe(BUDGET_ALERT.thresholdUsd);
      expect(EARLY_DEPLOYMENT.budgetAlert).toBe(BUDGET_ALERT);
      expect(EARLY_DEPLOYMENT.estimatedMonthlyCost).toBe(ESTIMATED_MONTHLY_COST);
      expect(EARLY_DEPLOYMENT.billableServices).toBe(BILLABLE_SERVICES);
      expect(EARLY_DEPLOYMENT.sampleData).toBe(sampleDataFixture);
      expect(EARLY_DEPLOYMENT.checkFreeTier).toBe(isWithinFreeTierMock);
      expect(EARLY_DEPLOYMENT.routes).toEqual({
        health: '/health',
        apiPrefix: '/api',
        about: '/api/about',
        revalidate: '/api/revalidate',
        services: '/api/services',
        media: '/api/media',
      });
      expect(EARLY_DEPLOYMENT.status).toEqual({
        mt05Deploy: 'green',
        sampleDataLoaded: false,
        budgetWithinTier: true,
        indicesCreated: false,
      });
    });

    it('documents the billable services used during initialization', () => {
      expect(EARLY_DEPLOYMENT.billableServices.appHosting.name).toBe('Firebase App Hosting');
      expect(EARLY_DEPLOYMENT.billableServices.firestore.name).toBe('Cloud Firestore');
      expect(R2.name).toBe('Cloudflare R2');
      expect(RESEND.name).toBe('Resend');
    });
  });

  describe('initializeEarlyDeployment', () => {
    it('runs in dry-run mode by default without persisting data', async () => {
      const result = await initializeEarlyDeployment();

      expect(seedFirestoreMock).not.toHaveBeenCalled();
      expect(result.status).toBe(EARLY_DEPLOYMENT.status);
      expect(result.sampleData).toBe(sampleDataFixture);
      expect(result.budget).toBe(BUDGET_ALERT);

      const output = loggedText();
      expect(output).toContain('Inicializando MT1.5: Despliegue Temprano');
      expect(output).toContain('Modo dry-run: no se persisten datos en Firestore');
      expect(output).toContain('Propiedades de muestra: 2');
      expect(output).toContain('Servicios de muestra: 1');
      expect(output).toContain('Documento About: 1 secciones');
      expect(output).toContain('Modo dry-run completado');
    });

    it('honors an explicit dry-run flag', async () => {
      const result = await initializeEarlyDeployment(true);

      expect(seedFirestoreMock).not.toHaveBeenCalled();
      expect(result.sampleData.properties).toHaveLength(2);
      expect(loggedText()).toContain('Modo dry-run: no se persisten datos en Firestore');
    });

    it('persists the sample data when dry-run is disabled', async () => {
      const result = await initializeEarlyDeployment(false);

      expect(seedFirestoreMock).toHaveBeenCalledTimes(1);
      expect(seedFirestoreMock).toHaveBeenCalledWith(false);
      expect(result.sampleData).toBe(sampleDataFixture);

      const output = loggedText();
      expect(output).toContain('Persistiendo datos de muestra en Firestore');
      expect(output).toContain('Datos de muestra persistidos exitosamente');
      expect(output).toContain('MT1.5: Despliegue temprano inicializado');
    });

    it('logs the exceeded free-tier marker when usage is outside the free tier', async () => {
      isWithinFreeTierMock.mockReturnValueOnce(false);

      await initializeEarlyDeployment();

      expect(isWithinFreeTierMock).toHaveBeenCalledTimes(1);
      expect(loggedText()).toContain('Uso actual dentro de free tier: ✗');
    });

    it('is idempotent across repeated dry runs', async () => {
      const first = await initializeEarlyDeployment();
      const second = await initializeEarlyDeployment();

      expect(second.status).toEqual(first.status);
      expect(second.sampleData).toBe(first.sampleData);
      expect(second.budget).toBe(first.budget);
      expect(seedFirestoreMock).not.toHaveBeenCalled();
    });

    it('propagates seed errors and can be retried without leftover state', async () => {
      seedFirestoreMock.mockRejectedValueOnce(new Error('seed failed'));

      await expect(initializeEarlyDeployment(false)).rejects.toThrow('seed failed');

      const retried = await initializeEarlyDeployment(false);
      expect(seedFirestoreMock).toHaveBeenCalledTimes(2);
      expect(retried.status).toBe(EARLY_DEPLOYMENT.status);
      expect(loggedText()).toContain('Datos de muestra persistidos exitosamente');
    });
  });
});
