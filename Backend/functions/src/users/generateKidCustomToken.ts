import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * generateKidCustomToken Callable
 * - Authenticated parent requests a custom Auth token for a specific kid.
 * - Used to generate a QR Code on the parent's device so the kid can scan and log in instantly.
 */
export const generateKidCustomToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
  }

  const { kidUid } = data as { kidUid?: string };
  if (!kidUid) {
    throw new functions.https.HttpsError('invalid-argument', 'kidUid is required.');
  }

  const callerUid = context.auth.uid;
  const db = admin.firestore();

  // Verify caller is a parent and child belongs to the same family
  const [callerSnap, kidSnap] = await Promise.all([
    db.collection('Users').doc(callerUid).get(),
    db.collection('Users').doc(kidUid).get(),
  ]);

  if (!callerSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Parent profile not found.');
  }
  if (!kidSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Kid profile not found.');
  }

  const caller = callerSnap.data()!;
  const kid = kidSnap.data()!;

  if (caller.role !== 'parent') {
    throw new functions.https.HttpsError('permission-denied', 'Only parents can generate custom tokens.');
  }

  // Cross-family security check
  const isLinked = (caller.linkedKids || []).includes(kidUid) || kid.linkedParentId === callerUid;
  const sameFamily = caller.familyId && caller.familyId === kid.familyId;

  if (!isLinked && !sameFamily) {
    throw new functions.https.HttpsError('permission-denied', 'Kid profile is not linked to your account.');
  }

  try {
    // Create Custom Firebase Auth Token for child user
    const customToken = await admin.auth().createCustomToken(kidUid);
    return { success: true, customToken };
  } catch (error: any) {
    console.error('Error creating custom token:', error);
    throw new functions.https.HttpsError('internal', `Failed to generate custom token: ${error.message}`);
  }
});
