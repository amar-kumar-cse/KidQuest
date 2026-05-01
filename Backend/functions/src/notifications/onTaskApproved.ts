import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Firestore trigger: When a task's status changes to 'completed',
 * send a push notification to the kid.
 */
export const onTaskApproved = functions.firestore
  .document('Tasks/{taskId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only fire when status transitions to completed
    if (before.status === after.status || after.status !== 'completed') {
      return null;
    }

    const kidSnap = await admin
      .firestore()
      .collection('Users')
      .doc(after.assignedToUid)
      .get();

    const kid = kidSnap.data();
    const token = kid?.fcmToken ?? kid?.notificationToken;
    if (!token) return null;

    const xpAwarded = after.finalXp ?? after.xp;

    try {
      await admin.messaging().send({
        token,
        notification: {
          title: '🎉 Task Approved!',
          body: `You earned ${xpAwarded} XP for "${after.title}"! Keep it up! 🚀`,
        },
        data: {
          taskId: context.params.taskId,
          type: 'task_approved',
        },
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      });
    } catch (err) {
      console.error('[onTaskApproved] FCM send failed:', err);
    }

    return null;
  });
