import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

async function deleteQueryBatch(query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>) {
  const snapshot = await query.limit(500).get();
  if (snapshot.empty) return 0;
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snapshot.size;
}

async function deleteUserStorageFiles(uid: string, familyId: string | null) {
  try {
    const bucket = admin.storage().bucket();
    // Delete avatar files prefix
    await bucket.deleteFiles({ prefix: `avatars/${uid}` }).catch(() => {});

    // For proofs: tasks are stored as proofs/{familyId}/{taskId}.{ext}
    if (familyId) {
      const tasksSnap = await db.collection('Tasks').where('assignedToUid', '==', uid).get();
      const deletes: Promise<any>[] = [];
      tasksSnap.forEach((t) => {
        const taskId = t.id;
        // delete any file matching proofs/{familyId}/{taskId}.*
        deletes.push(bucket.deleteFiles({ prefix: `proofs/${familyId}/${taskId}` }).catch(() => {}));
      });
      await Promise.all(deletes);
    }
  } catch (e) {
    console.warn('deleteUserStorageFiles failed', e && e.toString());
  }
}

export const processDeletionJob = functions.firestore.document('DeletionJobs/{jobId}').onCreate(async (snap, ctx) => {
  const job = snap.data() as any;
  const jobRef = snap.ref;
  const uid = job.uid;
  const familyId = job.familyId || null;

  await jobRef.update({ status: 'in_progress', updatedAt: admin.firestore.Timestamp.now() });

  try {
    // Delete Tasks where assignedToUid == uid or parentId == uid
    let removed = 0;
    do {
      removed = await deleteQueryBatch(db.collection('Tasks').where('assignedToUid', '==', uid));
    } while (removed > 0);
    do {
      removed = await deleteQueryBatch(db.collection('Tasks').where('parentId', '==', uid));
    } while (removed > 0);

    // Notifications
    do {
      removed = await deleteQueryBatch(db.collection('Notifications').where('recipientId', '==', uid));
    } while (removed > 0);

    // AISuggestions
    do {
      removed = await deleteQueryBatch(db.collection('AISuggestions').where('requestedBy', '==', uid));
    } while (removed > 0);

    // AIVerifications
    do {
      removed = await deleteQueryBatch(db.collection('AIVerifications').where('requestedBy', '==', uid));
    } while (removed > 0);

    // RewardClaims where kidId or parentId == uid
    do {
      removed = await deleteQueryBatch(db.collection('RewardClaims').where('kidId', '==', uid));
    } while (removed > 0);
    do {
      removed = await deleteQueryBatch(db.collection('RewardClaims').where('parentId', '==', uid));
    } while (removed > 0);

    // Delete user doc
    await db.collection('Users').doc(uid).delete().catch(() => {});

    // Delete storage files owned by user (avatars + proofs tied to their tasks)
    await deleteUserStorageFiles(uid, familyId);

    // Delete auth user
    try {
      await admin.auth().deleteUser(uid);
    } catch (e) {
      console.warn('Failed to delete auth user', e && e.toString());
    }

    await jobRef.update({ status: 'completed', updatedAt: admin.firestore.Timestamp.now() });
  } catch (err) {
    console.error('processDeletionJob failed', err);
    await jobRef.update({ status: 'failed', error: String(err), updatedAt: admin.firestore.Timestamp.now() });
  }
});
