let renewalPromise: Promise<string> | null = null;
export async function renewSession(): Promise<string> {
  if (renewalPromise) return renewalPromise;
  renewalPromise = (async () => {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken(true);
    if (!token) throw new Error('No session');
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Renew failed');
    return token;
  })();
  renewalPromise.then(
    () => {
      renewalPromise = null;
    },
    () => {
      renewalPromise = null;
    },
  );
  return renewalPromise;
}
