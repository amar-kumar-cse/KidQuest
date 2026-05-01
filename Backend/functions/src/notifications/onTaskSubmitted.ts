import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Firestore trigger: When a task's status changes to 'pending_approval',
 * send a push notification to the parent.
 */
export const onTaskSubmitted = functions.firestore
  .document('Tasks/{taskId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only fire when status transitions to pending_approval
    if (before.status === after.status || after.status !== 'pending_approval') {
      return null;
    }

    const parentSnap = await admin
      .firestore()
      .collection('Users')
      .doc(after.parentId)
      .get();

    const parent = parentSnap.data();
    const token = parent?.fcmToken ?? parent?.notificationToken;
    if (!token) return null;

    try {
      await admin.messaging().send({
        token,
        notification: {
          title: '⭐ Task Ready for Review!',
          body: `${after.assignedToName ?? after.assignedTo} completed "${after.title}" — tap to review!`,
        },
        data: {
          taskId: context.params.taskId,
          type: 'task_submitted',
        },
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      });
    } catch (err) {
      console.error('[onTaskSubmitted] FCM send failed:', err);
    }

    return null;
  });
