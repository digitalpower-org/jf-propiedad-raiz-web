'use client';

// AC1.5.4: Single-flight renewal — only one concurrent renewal attempt
let renewalPromise: Promise<boolean> | null = null;

export async function renewSessionSingleFlight(): Promise<boolean> {
  if (renewalPromise) return renewalPromise;
  renewalPromise = (async () => {
    try {
      const res = await fetch('/api/auth/session', { method: 'POST' });
      return res.ok;
    } finally {
      renewalPromise = null;
    }
  })();
  return renewalPromise;
}
