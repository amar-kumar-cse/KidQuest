import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Verify a family code server-side (prevents enumeration attacks from client).
 * Links the kid (caller) to the parent identified by the code.
 */
export const verifyFamilyCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
  }

  const { code } = data as { code: string };

  if (!code || typeof code !== 'string' || code.length !== 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid family code format.');
  }

  const db = admin.firestore();

  const codeSnap = await db
    .collection('FamilyCodes')
    .doc(code.toUpperCase().trim())
    .get();

  if (!codeSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Family code not found. Please check and try again.');
  }

  const codeData = codeSnap.data()!;

  // Check expiry
  const expiresAt = codeData.expiresAt?.toDate?.() ?? new Date(0);
  if (expiresAt < new Date()) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'This family code has expired. Ask your parent to generate a new one.',
    );
  }

  const parentId = codeData.parentId as string;
  const kidId = context.auth.uid;

  // Prevent re-linking if already linked
  const kidSnap = await db.collection('Users').doc(kidId).get();
  const kidData = kidSnap.data()!;
  if (kidData.linkedParentId && kidData.linkedParentId === parentId) {
    throw new functions.https.HttpsError('already-exists', 'You are already linked to this parent.');
  }

  // Atomically link kid ↔ parent
  await db.runTransaction(async (tx) => {
    const parentRef = db.collection('Users').doc(parentId);
    const kidRef = db.collection('Users').doc(kidId);

    tx.update(kidRef, {
      linkedParentId: parentId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    tx.update(parentRef, {
      linkedKids: admin.firestore.FieldValue.arrayUnion(kidId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  // Fetch parent name to return to UI
  const parentSnap = await db.collection('Users').doc(parentId).get();
  const parentName = (parentSnap.data()?.name as string) ?? 'Your Parent';

  return { success: true, parentName };
});
