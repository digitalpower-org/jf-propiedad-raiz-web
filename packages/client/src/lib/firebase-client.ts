import { initializeApp, getApps, FirebaseApp, getApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  onIdTokenChanged,
  User,
  UserCredential,
} from 'firebase/auth';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
};

const firebaseApp: FirebaseApp = getApps().length === 0 ? initializeApp(config) : getApp();
export const firebaseAuth: Auth = getAuth(firebaseApp);

export {
  firebaseApp,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  onIdTokenChanged,
};
export type { User, UserCredential };
