import { createHash } from 'crypto';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { z } from 'zod';

import type { RateLimiter } from '../../application/ports/rate-limiter';
import { RateLimitedError } from '../../application/ports/rate-limiter';

const RateLimitDocumentSchema = z.object({
  keyHash: z.string().min(1),
  count: z.number().int().nonnegative(),
  windowStart: z.number().positive(),
  expiresAt: z.instanceof(Timestamp),
});

type RateLimitDocument = z.infer<typeof RateLimitDocumentSchema>;

interface FirestoreRateLimiterOptions {
  now?: () => number;
  ttlSeconds?: number;
}

/**
 * Adaptador Firestore del puerto RateLimiter (US3.4).
 *
 * Contador atómico por clave con hash SHA-256 (sin PII en claro) y TTL de
 * expiración. Cada check lee y escribe un único documento dentro de una
 * transacción, por lo que el límite es global entre instancias. No usa
 * FieldValue.serverTimestamp() ni puerto Clock.
 */
export function createFirestoreRateLimiter(
  db: Firestore,
  options: FirestoreRateLimiterOptions = {},
): RateLimiter {
  const now = options.now ?? Date.now;
  const ttlSeconds = options.ttlSeconds ?? 300;
  const rateLimits = db.collection('rate_limits');

  async function check(key: string, limit: number, windowSeconds: number): Promise<void> {
    const nowMs = now();
    const keyHash = createHash('sha256').update(key).digest('hex');
    const ref = rateLimits.doc(keyHash);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      let count: number;
      let windowStart: number;

      if (!snap.exists) {
        count = 1;
        windowStart = nowMs;
      } else {
        const doc: RateLimitDocument = RateLimitDocumentSchema.parse(snap.data());
        const ventanaExpirada = doc.windowStart <= nowMs - windowSeconds * 1000;
        if (ventanaExpirada) {
          count = 1;
          windowStart = nowMs;
        } else {
          count = doc.count + 1;
          windowStart = doc.windowStart;
        }
      }

      if (count > limit) {
        throw new RateLimitedError(`Límite de ${limit} solicitudes por ${windowSeconds}s excedido`);
      }

      await tx.set(ref, {
        keyHash,
        count,
        windowStart,
        expiresAt: Timestamp.fromMillis(nowMs + ttlSeconds * 1000),
      });
    });
  }

  return { check };
}
