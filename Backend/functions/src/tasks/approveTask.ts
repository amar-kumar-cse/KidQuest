import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

/**
 * approveTask callable function
 * - Verifies caller is a parent and in the same family as the child
 * - Uses a transaction to mark task approved and increment child's XP atomically
 * - Idempotent: if task already approved/completed, it will not double-award XP
 */
export const approveTask = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
  }

  const { taskId, childUid } = data as { taskId?: string; childUid?: string };

  if (!taskId || typeof taskId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'taskId is required.');
  }
  if (!childUid || typeof childUid !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'childUid is required.');
  }

  const db = admin.firestore();
  const callerUid = context.auth.uid;
  const callerRef = db.collection('Users').doc(callerUid);
  const childRef = db.collection('Users').doc(childUid);
  const taskRef = db.collection('Tasks').doc(taskId);

  const result = await db.runTransaction(async (tx) => {
    const [callerSnap, childSnap, taskSnap] = await Promise.all([
      tx.get(callerRef),
      tx.get(childRef),
      tx.get(taskRef),
    ]);

    if (!callerSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Caller user profile not found.');
    }
    if (!childSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Child user not found.');
    }
    if (!taskSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Task not found.');
    }

    const caller = callerSnap.data() as any;
    const child = childSnap.data() as any;
    const task = taskSnap.data() as any;

    // Caller must be a parent
    if (caller.role !== 'parent') {
      throw new functions.https.HttpsError('permission-denied', 'Only parents can approve tasks.');
    }

    // Family check
    if (!caller.familyId || !child.familyId || caller.familyId !== child.familyId) {
      throw new functions.https.HttpsError('permission-denied', 'Parent and child must belong to the same family.');
    }

    // Task must belong to same family and be assigned to the provided child
    if (task.assignedToUid !== childUid || task.familyId !== caller.familyId) {
      throw new functions.https.HttpsError('failed-precondition', 'Task does not belong to this child or family.');
    }

    // Idempotency: if already approved/completed, do nothing
    if (task.status === 'completed' || task.approvedAt || task.status === 'approved') {
      return { success: true, alreadyProcessed: true };
    }

    const xp = typeof task.xp === 'number' ? task.xp : 0;

    // Compute streak logic using existing child fields inside transaction
    const now = admin.firestore.Timestamp.now();
    const lastCompletedAt: admin.firestore.Timestamp | undefined = child.lastCompletedAt;

    let newStreak = 1;
    let bestStreak = child.bestStreak || 0;

    if (lastCompletedAt) {
      const last = lastCompletedAt.toDate();
      const today = new Date();
      // Normalize to midnight to compare days
      const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate()).getTime();
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const diffDays = Math.round((todayDay - lastDay) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // already completed today; keep current streak
        newStreak = child.currentStreak || 1;
      } else if (diffDays === 1) {
        newStreak = (child.currentStreak || 0) + 1;
      } else {
        newStreak = 1;
      }
    }

    if (newStreak > bestStreak) bestStreak = newStreak;

    // Update task and child atomically
    tx.update(taskRef, {
      status: 'completed',
      approvedAt: now,
      approvedBy: callerUid,
      updatedAt: now,
    });

    tx.update(childRef, {
      totalXp: admin.firestore.FieldValue.increment(xp),
      tasksCompleted: admin.firestore.FieldValue.increment(1),
      lastCompletedAt: now,
      currentStreak: newStreak,
      bestStreak: bestStreak,
    });

    // Optionally, write a notification (non-blocking for return value)
    const notifRef = db.collection('Notifications').doc();
    tx.set(notifRef, {
      recipientId: childUid,
      type: 'task_approved',
      taskId: taskId,
      xpAwarded: xp,
      createdAt: now,
      by: callerUid,
      familyId: caller.familyId,
    });

    return { success: true, xpAwarded: xp };
  });

  // Send push notification to child (best-effort; do not fail the function if push fails)
  try {
    const childSnap2 = await db.collection('Users').doc(childUid).get();
    const childData: any = childSnap2.exists ? childSnap2.data() : null;
    const pushToken = childData?.expoPushToken;
    if (pushToken) {
      const payload = {
        to: pushToken,
        sound: 'default',
        title: 'Balle Balle! 🎉',
        body: `You earned ${result.xpAwarded} XP! Great job!`,
        data: { type: 'task_approved', taskId },
      };
      await axios.post('https://exp.host/--/api/v2/push/send', payload, { headers: { 'Content-Type': 'application/json' } });
    }
  } catch (err) {
    console.warn('Failed to send push after approval:', err && err.toString());
  }

  return result;
});

