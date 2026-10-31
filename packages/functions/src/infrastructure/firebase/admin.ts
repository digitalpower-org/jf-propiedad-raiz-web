import * as admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

export const getAdminApp = () => {
  if (!getApps().length) {
    admin.initializeApp();
  }
  return admin.app();
};

export const db = admin.firestore(getAdminApp());
