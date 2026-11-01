import { describe, expect, it } from 'vitest';

import {
  BILLABLE_SERVICES,
  BUDGET_ALERT,
  ESTIMATED_MONTHLY_COST,
  FIRESTORE_INDEXES,
  R2,
  RESEND,
  SECRET_PATTERNS,
  containsSecretPatterns,
  firebase,
  isWithinFreeTier,
  type Usage,
} from './budget-config';

function usageWith(field: keyof Usage, value: number): Usage {
  const usage: Partial<Record<keyof Usage, number>> = {};
  usage[field] = value;
  return usage;
}

function withDeleted<T>(target: object, key: PropertyKey, run: () => T): T {
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  Reflect.deleteProperty(target, key);
  try {
    return run();
  } finally {
    if (descriptor) {
      Object.defineProperty(target, key, descriptor);
    }
  }
}

const LIMITS: ReadonlyArray<{
  field: keyof Usage;
  below: number;
  at: number;
  above: number;
}> = [
  { field: 'storageGB', below: 0.5, at: 1, above: 2 },
  { field: 'readsPerDay', below: 49_999, at: 50_000, above: 50_001 },
  { field: 'writesPerDay', below: 19_999, at: 20_000, above: 20_001 },
  { field: 'bandwidthGB', below: 9, at: 10, above: 11 },
  { field: 'functionInvocations', below: 99_999, at: 100_000, above: 100_001 },
  { field: 'executionsPerMonth', below: 3_599_999, at: 3_600_000, above: 3_600_001 },
  { field: 'charactersPerMonth', below: 499_999, at: 500_000, above: 500_001 },
  { field: 'egressGB', below: 0.9, at: 1, above: 1.1 },
  { field: 'emailsPerMonth', below: 29_999, at: 30_000, above: 30_001 },
];

const SECRET_SAMPLES: ReadonlyArray<{ pattern: string; content: string }> = [
  { pattern: 'Firebase API key', content: `key=AIza${'A'.repeat(35)}` },
  { pattern: 'projectId', content: "projectId: 'jf-project-123'" },
  { pattern: 'privateKey', content: 'privateKey = "not-a-real-key"' },
  { pattern: 'Resend key', content: 'resend: "re_not_a_real_key"' },
  { pattern: 'Cloudflare token', content: 'api: "abcdefghijklmnopqrst"' },
  { pattern: 'JWT secret', content: "jwt = 'abcdefghijklmnop'" },
  { pattern: 'password', content: 'password: "hunter2hunter2"' },
  { pattern: 'service account', content: 'type: "service_account"' },
];

describe('budget-config (US6.2, MT1.5)', () => {
  describe('exported constants', () => {
    it('lists every billable Firebase service with its free tier', () => {
      expect(Object.keys(BILLABLE_SERVICES)).toEqual([
        'appHosting',
        'firestore',
        'auth',
        'cloudScheduler',
        'cloudTranslation',
      ]);
      expect(BILLABLE_SERVICES.appHosting).toEqual({
        name: 'Firebase App Hosting',
        monthlyFreeTier: { bandwidthGB: 10, functionInvocations: 100_000 },
      });
      expect(BILLABLE_SERVICES.firestore).toEqual({
        name: 'Cloud Firestore',
        monthlyFreeTier: { storageGB: 1, readsPerDay: 50_000, writesPerDay: 20_000 },
      });
      expect(BILLABLE_SERVICES.auth).toEqual({
        name: 'Firebase Authentication',
        monthlyFreeTier: {},
      });
      expect(BILLABLE_SERVICES.cloudScheduler).toEqual({
        name: 'Cloud Scheduler',
        monthlyFreeTier: { jobs: 3, executionsPerMonth: 3_600_000 },
      });
      expect(BILLABLE_SERVICES.cloudTranslation).toEqual({
        name: 'Google Cloud Translation',
        monthlyFreeTier: { charactersPerMonth: 500_000 },
      });
    });

    it('exposes R2 and Resend free tiers', () => {
      expect(R2).toEqual({
        name: 'Cloudflare R2',
        monthlyFreeTier: { storageGB: 10, egressGB: 1 },
      });
      expect(RESEND).toEqual({
        name: 'Resend',
        monthlyFreeTier: { emailsPerMonth: 30_000 },
      });
    });

    it('regroups the Firebase services under the firebase alias', () => {
      expect(firebase.appHosting).toBe(BILLABLE_SERVICES.appHosting);
      expect(firebase.firestore).toBe(BILLABLE_SERVICES.firestore);
      expect(firebase.auth).toBe(BILLABLE_SERVICES.auth);
      expect(firebase.cloudScheduler).toBe(BILLABLE_SERVICES.cloudScheduler);
      expect(firebase.cloudTranslation).toBe(BILLABLE_SERVICES.cloudTranslation);
    });

    it('documents the zero-dollar estimate and the $10 alert', () => {
      expect(ESTIMATED_MONTHLY_COST).toEqual({ usd: 0 });
      expect(BUDGET_ALERT).toEqual({
        thresholdUsd: 10,
        name: 'JF Propiedad Raíz - Budget Alert',
      });
    });

    it('documents only the composite Firestore indexes', () => {
      expect(Object.keys(FIRESTORE_INDEXES)).toEqual(['properties', 'services', 'about']);
      expect(FIRESTORE_INDEXES.properties).toContainEqual(['status', 'ASC', 'operacion', 'ASC']);
      expect(FIRESTORE_INDEXES.services).toEqual([
        ['status', 'ASC'],
        ['orden', 'ASC', 'status', 'ASC'],
      ]);
      expect(FIRESTORE_INDEXES.about).toEqual([]);
    });

    it('exports the secret pattern catalogue', () => {
      expect(SECRET_PATTERNS).toHaveLength(8);
      expect(SECRET_PATTERNS.every((pattern) => pattern instanceof RegExp)).toBe(true);
    });
  });

  describe('isWithinFreeTier', () => {
    it.each(LIMITS)(
      'treats $field below and at the free limit as within tier, above as exceeded',
      ({ field, below, at, above }) => {
        expect(isWithinFreeTier(usageWith(field, below))).toBe(true);
        expect(isWithinFreeTier(usageWith(field, at))).toBe(true);
        expect(isWithinFreeTier(usageWith(field, above))).toBe(false);
      },
    );

    it('accepts an empty usage object', () => {
      expect(isWithinFreeTier({})).toBe(true);
    });

    it('treats zero, negative and NaN usage as within tier', () => {
      const zeroUsage: Usage = {
        storageGB: 0,
        bandwidthGB: 0,
        functionInvocations: 0,
        readsPerDay: 0,
        writesPerDay: 0,
        charactersPerMonth: 0,
        emailsPerMonth: 0,
        executionsPerMonth: 0,
        egressGB: 0,
      };
      expect(isWithinFreeTier(zeroUsage)).toBe(true);

      for (const field of Object.keys(zeroUsage) as Array<keyof Usage>) {
        expect(isWithinFreeTier(usageWith(field, -1))).toBe(true);
        expect(isWithinFreeTier(usageWith(field, Number.NaN))).toBe(true);
      }
    });

    it('rejects usage that exceeds a single limit while others are within tier', () => {
      const usage: Usage = {
        storageGB: 0.5,
        bandwidthGB: 9,
        functionInvocations: 1_000,
        readsPerDay: 1_000,
        writesPerDay: 500,
        charactersPerMonth: 10_000,
        emailsPerMonth: 100,
        executionsPerMonth: 100,
        egressGB: 0.1,
      };
      expect(isWithinFreeTier(usage)).toBe(true);
      expect(isWithinFreeTier({ ...usage, emailsPerMonth: 30_001 })).toBe(false);
    });

    it('falls back to the documented limits when scalar free-tier metadata is missing', () => {
      const firestoreTier = BILLABLE_SERVICES.firestore.monthlyFreeTier;
      const appHostingTier = BILLABLE_SERVICES.appHosting.monthlyFreeTier;
      const schedulerTier = BILLABLE_SERVICES.cloudScheduler.monthlyFreeTier;
      const translationTier = BILLABLE_SERVICES.cloudTranslation.monthlyFreeTier;
      const r2Tier = R2.monthlyFreeTier;
      const resendTier = RESEND.monthlyFreeTier;

      const removed: Array<{
        target: object;
        key: PropertyKey;
        descriptor: PropertyDescriptor;
      }> = [];
      const drop = (target: object, key: PropertyKey) => {
        const descriptor = Object.getOwnPropertyDescriptor(target, key);
        if (descriptor) {
          removed.push({ target, key, descriptor });
          Reflect.deleteProperty(target, key);
        }
      };

      try {
        drop(firestoreTier, 'storageGB');
        drop(firestoreTier, 'readsPerDay');
        drop(firestoreTier, 'writesPerDay');
        drop(appHostingTier, 'bandwidthGB');
        drop(appHostingTier, 'functionInvocations');
        drop(schedulerTier, 'executionsPerMonth');
        drop(translationTier, 'charactersPerMonth');
        drop(r2Tier, 'storageGB');
        drop(r2Tier, 'egressGB');
        drop(resendTier, 'emailsPerMonth');

        expect(
          isWithinFreeTier({
            storageGB: 1,
            readsPerDay: 50_000,
            writesPerDay: 20_000,
            bandwidthGB: 10,
            functionInvocations: 100_000,
            executionsPerMonth: 3_600_000,
            charactersPerMonth: 500_000,
            egressGB: 1,
            emailsPerMonth: 30_000,
          }),
        ).toBe(true);
      } finally {
        for (const { target, key, descriptor } of removed.reverse()) {
          Object.defineProperty(target, key, descriptor);
        }
      }
    });

    it('falls back when a service or its monthlyFreeTier object is missing', () => {
      const allWithin = {
        storageGB: 1,
        readsPerDay: 50_000,
        writesPerDay: 20_000,
        bandwidthGB: 10,
        functionInvocations: 100_000,
        executionsPerMonth: 3_600_000,
        charactersPerMonth: 500_000,
        egressGB: 1,
        emailsPerMonth: 30_000,
      } satisfies Usage;

      for (const service of [
        'firestore',
        'appHosting',
        'cloudScheduler',
        'cloudTranslation',
      ] as const) {
        withDeleted(BILLABLE_SERVICES, service, () => {
          expect(isWithinFreeTier(allWithin)).toBe(true);
        });
      }

      withDeleted(BILLABLE_SERVICES.firestore, 'monthlyFreeTier', () => {
        expect(isWithinFreeTier(allWithin)).toBe(true);
      });
      withDeleted(BILLABLE_SERVICES.appHosting, 'monthlyFreeTier', () => {
        expect(isWithinFreeTier(allWithin)).toBe(true);
      });
      withDeleted(BILLABLE_SERVICES.cloudScheduler, 'monthlyFreeTier', () => {
        expect(isWithinFreeTier(allWithin)).toBe(true);
      });
      withDeleted(BILLABLE_SERVICES.cloudTranslation, 'monthlyFreeTier', () => {
        expect(isWithinFreeTier(allWithin)).toBe(true);
      });
      withDeleted(R2, 'monthlyFreeTier', () => {
        expect(isWithinFreeTier(allWithin)).toBe(true);
      });
      withDeleted(RESEND, 'monthlyFreeTier', () => {
        expect(isWithinFreeTier(allWithin)).toBe(true);
      });
    });
  });

  describe('containsSecretPatterns', () => {
    it.each(SECRET_SAMPLES)('detects a $pattern literal', ({ content }) => {
      expect(containsSecretPatterns(content)).toBe(true);
    });

    it('returns false for harmless source code', () => {
      expect(
        containsSecretPatterns(`
        const threshold = 10;
        const service = 'firebase';
        const label = 'capital api';
        export function add(a: number, b: number) { return a + b; }
      `),
      ).toBe(false);
    });

    it('returns false for an empty string', () => {
      expect(containsSecretPatterns('')).toBe(false);
    });
  });
});
