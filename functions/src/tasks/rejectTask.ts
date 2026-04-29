import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Reject a task — resets it to 'pending' so the kid can resubmit.
 * Stores parent's rejection reason as parentNote.
 */
export const rejectTask = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
  }

  const { taskId, parentNote = '' } = data as { taskId: string; parentNote?: string };

  if (!taskId || typeof taskId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'taskId is required.');
  }

  const db = admin.firestore();
  const taskRef = db.collection('Tasks').doc(taskId);
  const taskSnap = await taskRef.get();

  if (!taskSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Task not found.');
  }

  const task = taskSnap.data()!;

  if (task.parentId !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Not the task owner.');
  }

  if (task.status !== 'pending_approval') {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Task status is "${task.status}", expected "pending_approval".`,
    );
  }

  // Reset task so kid can try again
  await taskRef.update({
    status: 'pending',
    proofUrl: admin.firestore.FieldValue.delete(),
    proofNote: admin.firestore.FieldValue.delete(),
    completedAt: admin.firestore.FieldValue.delete(),
    parentNote: parentNote || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});
