import { initializeApp, getApps } from 'firebase/app';
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
};
export const firebaseApp = getApps().length === 0 ? initializeApp(config) : getApps()[0];
