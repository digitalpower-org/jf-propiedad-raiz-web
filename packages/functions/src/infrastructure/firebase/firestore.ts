import type { App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

export function createFirestore(app: App): Firestore {
  return getFirestore(app);
}
