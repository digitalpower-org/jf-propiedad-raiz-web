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

function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  };
}

let _firebaseApp: FirebaseApp | null = null;
let _firebaseAuth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (typeof window === 'undefined') {
    throw new Error('Firebase not available during SSR. Use in client components only.');
  }
  if (!_firebaseApp) {
    _firebaseApp = getApps().length === 0 ? initializeApp(getFirebaseConfig()) : getApp();
  }
  return _firebaseApp;
}

export function getFirebaseAuth(): Auth {
  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth not available during SSR. Use in client components only.');
  }
  if (!_firebaseAuth) {
    _firebaseAuth = getAuth(getFirebaseApp());
  }
  return _firebaseAuth;
}

export { signInWithEmailAndPassword, signOut, GoogleAuthProvider, onIdTokenChanged };
export type { User, UserCredential };
