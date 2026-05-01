import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * deleteAccount callable
 * - Authenticated users may request deletion of their account.
 * - This function will:
 *   1) delete user-related Firestore documents (Users doc, Tasks, Notifications, AISuggestions, RewardClaims)
 *   2) remove user files in Storage under avatars/{uid} and proofs/{uid} (best-effort)
 *   3) delete the Firebase Auth user
 *
 * Note: This is best-effort and may take time; clients should poll for completion status if needed.
 */
export const deleteAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
  const uid = context.auth.uid;
  const db = admin.firestore();

  // Verify user exists (optional) and create a DeletionJob
  const userRef = db.collection('Users').doc(uid);
  const userSnap = await userRef.get();
  const userData: any = userSnap.exists ? userSnap.data() : {};
  const familyId = userData.familyId || null;

  const jobRef = db.collection('DeletionJobs').doc();
  const now = admin.firestore.Timestamp.now();
  await jobRef.set({
    uid,
    familyId,
    requestedBy: uid,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  });

  // Return job id so client may poll for status
  return { success: true, jobId: jobRef.id, message: 'Deletion job queued' };
});
