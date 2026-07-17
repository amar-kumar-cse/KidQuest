import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

/**
 * Reject a task — resets it to 'pending' so the kid can resubmit.
 * Stores parent's rejection reason as parentNote.
 *
 * Security:
 *  - Caller must be authenticated
 *  - Caller must be the parent who owns the task
 *  - Caller and task must share the same familyId
 *  - Task must be in 'pending_approval' status
 *
 * Side effects:
 *  - Sends Expo push notification to the kid (best-effort)
 *  - Creates an in-app Notification document for the kid
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
  const callerUid = context.auth.uid;
  const callerRef = db.collection('Users').doc(callerUid);
  const taskRef = db.collection('Tasks').doc(taskId);

  const [callerSnap, taskSnap] = await Promise.all([
    callerRef.get(),
    taskRef.get(),
  ]);

  if (!callerSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Caller profile not found.');
  }
  if (!taskSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Task not found.');
  }

  const caller = callerSnap.data()!;
  const task = taskSnap.data()!;

  // Caller must be a parent
  if (caller.role !== 'parent') {
    throw new functions.https.HttpsError('permission-denied', 'Only parents can reject tasks.');
  }

  // Task must belong to this parent
  if (task.parentId !== callerUid) {
    throw new functions.https.HttpsError('permission-denied', 'Not the task owner.');
  }

  // Family check — caller and task must share familyId
  if (!caller.familyId || caller.familyId !== task.familyId) {
    throw new functions.https.HttpsError('permission-denied', 'Task does not belong to your family.');
  }

  // Task must be awaiting approval
  if (task.status !== 'pending_approval') {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Task status is "${task.status}", expected "pending_approval".`,
    );
  }

  const now = admin.firestore.Timestamp.now();

  // Reset task so kid can try again
  await taskRef.update({
    status: 'pending',
    proofUrl: admin.firestore.FieldValue.delete(),
    proofNote: admin.firestore.FieldValue.delete(),
    completedAt: admin.firestore.FieldValue.delete(),
    bonusXp: 0,
    parentNote: parentNote || null,
    updatedAt: now,
  });

  // Create in-app notification for the kid
  const kidUid = task.assignedToUid as string;
  if (kidUid) {
    const notifRef = db.collection('Notifications').doc();
    await notifRef.set({
      recipientId: kidUid,
      type: 'task_rejected',
      taskId,
      title: 'Task Returned',
      body: `"${task.title || 'A task'}" needs another try.${parentNote ? ` Note: ${parentNote}` : ''}`,
      createdAt: now,
      isRead: false,
      by: callerUid,
      familyId: caller.familyId,
    });

    // Send Expo push notification to kid (best-effort)
    try {
      const kidSnap = await db.collection('Users').doc(kidUid).get();
      const kidData = kidSnap.exists ? kidSnap.data() : null;
      const pushToken = kidData?.expoPushToken;
      if (pushToken && typeof pushToken === 'string') {
        await axios.post('https://exp.host/--/api/v2/push/send', {
          to: pushToken,
          sound: 'default',
          title: '🔄 Quest Returned',
          body: `"${task.title}" needs another try. ${parentNote ? parentNote : 'Check the details!'}`,
          data: { type: 'task_rejected', taskId },
        }, { headers: { 'Content-Type': 'application/json' }, timeout: 5000 });
      }
    } catch (err: any) {
      console.warn('[rejectTask] Push notification failed:', err?.toString?.() || err);
    }
  }

  return { success: true };
});
