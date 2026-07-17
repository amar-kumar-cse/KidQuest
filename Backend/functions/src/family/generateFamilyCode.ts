import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * generateFamilyCode callable
 * - Generates a secure, 6-character alphanumeric invite code.
 * - Enforces that only parents can generate a code.
 * - Stores the code in Firestore with a 24-hour expiry and links it to the parent's familyId.
 */
export const generateFamilyCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
  }

  const db = admin.firestore();
  const parentUid = context.auth.uid;
  const parentRef = db.collection('Users').doc(parentUid);
  const parentSnap = await parentRef.get();

  if (!parentSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Parent profile not found.');
  }

  const parentData = parentSnap.data()!;
  
  if (parentData.role !== 'parent') {
    throw new functions.https.HttpsError('permission-denied', 'Only parents can generate invite codes.');
  }

  // Ensure parent has a familyId (create one if they somehow don't)
  let familyId = parentData.familyId;
  if (!familyId) {
    familyId = parentUid; // Fallback to parent's UID as family ID
    await parentRef.update({ familyId });
  }

  // Generate a random 6-character code avoiding ambiguous characters
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour expiry

  await db.collection('FamilyCodes').doc(code).set({
    parentId: parentUid,
    familyId: familyId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
  });

  return { success: true, code };
});
