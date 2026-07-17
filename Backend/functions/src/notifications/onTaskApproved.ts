import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

/**
 * Firestore trigger: When a task's status changes to 'completed',
 * send a push notification to the kid via Expo Push API.
 *
 * This fires automatically when the parent approves a task via Cloud Function.
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

    const kidUid = after.assignedToUid;
    if (!kidUid) return null;

    const db = admin.firestore();

    // Fetch kid's push token
    const kidSnap = await db.collection('Users').doc(kidUid).get();
    if (!kidSnap.exists) return null;

    const kid = kidSnap.data()!;
    const pushToken = kid.expoPushToken;
    const xpAwarded = after.finalXp ?? after.xp ?? 0;

    // Create in-app notification
    const notifRef = db.collection('Notifications').doc();
    await notifRef.set({
      recipientId: kidUid,
      type: 'task_approved',
      taskId: context.params.taskId,
      xpAwarded,
      title: '🎉 Task Approved!',
      body: `You earned ${xpAwarded} XP for "${after.title}"! Keep it up! 🚀`,
      createdAt: admin.firestore.Timestamp.now(),
      isRead: false,
      familyId: after.familyId || null,
    });

    // Send Expo push notification (best-effort)
    if (pushToken && typeof pushToken === 'string') {
      try {
        await axios.post('https://exp.host/--/api/v2/push/send', {
          to: pushToken,
          sound: 'default',
          title: '🎉 Task Approved!',
          body: `You earned ${xpAwarded} XP for "${after.title}"! Keep it up! 🚀`,
          data: {
            taskId: context.params.taskId,
            type: 'task_approved',
            xp: xpAwarded,
          },
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        });
      } catch (err: any) {
        console.error('[onTaskApproved] Expo push send failed:', err?.toString?.() || err);
      }
    }

    return null;
  });
