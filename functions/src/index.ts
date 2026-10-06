import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

if (!getApps().length) initializeApp();
const adminApp = getApp();

export const deleteAccount = onCall({ region: 'us-central1', timeoutSeconds: 120 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'You must be signed in to delete an account.');
  const authTime = Number(request.auth?.token.auth_time || 0);
  if (!authTime || Math.floor(Date.now() / 1000) - authTime > 5 * 60) {
    throw new HttpsError('failed-precondition', 'Recent password reauthentication is required.');
  }

  const firestore = getFirestore(adminApp);
  const bucket = getStorage(adminApp).bucket();

  // The UID comes only from the verified callable auth token. No client-provided
  // identifier is read or accepted as a deletion target.
  const cleanup = await Promise.allSettled([
    firestore.recursiveDelete(firestore.doc(`users/${uid}`)),
    bucket.deleteFiles({ prefix: `users/${uid}/` }),
  ]);

  const failures = cleanup.filter((result) => result.status === 'rejected');
  if (failures.length) {
    logger.error('Account data cleanup failed; Auth account retained for retry.', { uid, failures });
    throw new HttpsError('internal', 'Account cleanup was incomplete. The login was retained so cleanup can be retried.');
  }

  try {
    await getAuth(adminApp).deleteUser(uid);
  } catch (error) {
    logger.error('Data cleanup succeeded but Auth deletion failed.', { uid, error });
    throw new HttpsError('internal', 'Data cleanup completed but the login could not be deleted. Contact support or retry.');
  }

  logger.info('Account deleted by authenticated owner.', { uid });
  return { success: true };
});
