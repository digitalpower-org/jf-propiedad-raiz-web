'use client';
import { signInWithPopup, GoogleAuthProvider, getAuth } from 'firebase/auth';
import { firebaseApp } from '../../../../lib/firebase-client';
export default function AdminLogin() {
  const handleGoogle = async () => {
    const auth = getAuth(firebaseApp);
    await signInWithPopup(auth, new GoogleAuthProvider());
    window.location.href = '/admin';
  };
  return <button onClick={handleGoogle}>Iniciar con Google</button>;
}
