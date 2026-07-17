import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

/**
 * Firestore trigger: When a task's status changes to 'pending_approval',
 * send a push notification to the parent via Expo Push API.
 *
 * This fires automatically when the kid submits proof (status: pending → pending_approval).
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

    const parentId = after.parentId;
    if (!parentId) return null;

    const db = admin.firestore();

    // Fetch parent's push token
    const parentSnap = await db.collection('Users').doc(parentId).get();
    if (!parentSnap.exists) return null;

    const parent = parentSnap.data()!;
    const pushToken = parent.expoPushToken;

    // Create in-app notification
    const notifRef = db.collection('Notifications').doc();
    await notifRef.set({
      recipientId: parentId,
      type: 'task_submitted',
      taskId: context.params.taskId,
      title: '⭐ Task Ready for Review!',
      body: `${after.assignedToName ?? after.assignedTo ?? 'Your kid'} completed "${after.title}" — tap to review!`,
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
          title: '⭐ Task Ready for Review!',
          body: `${after.assignedToName ?? after.assignedTo ?? 'Your kid'} completed "${after.title}" — tap to review!`,
          data: {
            taskId: context.params.taskId,
            type: 'task_submitted',
          },
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        });
      } catch (err: any) {
        console.error('[onTaskSubmitted] Expo push send failed:', err?.toString?.() || err);
      }
    }

    return null;
  });
