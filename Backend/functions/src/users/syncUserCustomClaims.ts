import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * syncUserCustomClaims Trigger:
 * Firestore onCreate/onUpdate trigger on Users/{uid}.
 * Automatically syncs the user's role and linkedParentId into Firebase Auth Custom Claims.
 * This enables 0-read, instant evaluation inside firestore.rules and storage.rules!
 */
export const syncUserCustomClaims = functions.firestore
  .document('Users/{uid}')
  .onWrite(async (change, context) => {
    const uid = context.params.uid;
    const afterData = change.after.exists ? change.after.data() : null;

    if (!afterData) {
      // Document deleted - claims will become irrelevant once Auth record is deleted
      return null;
    }

    const role = afterData.role || 'kid';
    const parentId = afterData.linkedParentId || null;
    const isAdmin = role === 'admin' || afterData.isAdmin === true;

    try {
      const userRecord = await admin.auth().getUser(uid).catch(() => null);
      if (!userRecord) {
        // Auth user might not exist yet if created as a local child profile
        return null;
      }

      const existingClaims = userRecord.customClaims || {};
      if (
        existingClaims.role === role &&
        existingClaims.parentId === parentId &&
        existingClaims.admin === isAdmin
      ) {
        // No changes needed
        return null;
      }

      await admin.auth().setCustomUserClaims(uid, {
        ...existingClaims,
        role,
        parentId,
        admin: isAdmin,
      });

      console.log(`[syncUserCustomClaims] Successfully synced custom claims for user ${uid}: role=${role}`);
      return null;
    } catch (error) {
      console.error(`[syncUserCustomClaims] Error syncing claims for user ${uid}:`, error);
      return null;
    }
  });

/**
 * setUserRole Callable:
 * Allows a newly signed up user to select their initial account role ('parent' | 'teacher').
 * Child roles are created by parents, not standalone.
 * Once a role is set, it is IMMUTABLE by client.
 */
export const setUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { role } = data as { role?: string };
  if (!role || !['parent', 'teacher'].includes(role)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Valid role is required ("parent" or "teacher"). Child accounts must be created by a parent.'
    );
  }

  const uid = context.auth.uid;
  const db = admin.firestore();
  const userRef = db.collection('Users').doc(uid);
  const userSnap = await userRef.get();

  if (userSnap.exists && userSnap.data()?.role) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'User role has already been established and cannot be changed.'
    );
  }

  // Update Firestore and set Auth Custom Claims
  await userRef.set(
    {
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await admin.auth().setCustomUserClaims(uid, {
    role,
    admin: false,
  });

  return { success: true, role };
});
