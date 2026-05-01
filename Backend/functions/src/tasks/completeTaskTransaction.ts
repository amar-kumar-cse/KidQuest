import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

/**
 * completeTaskTransaction
 * - Params: { taskId, childUid, xpValue }
 * - Verifies caller is a parent and in same family as child
 * - Uses transaction to mark task 'approved' and increment child's totalXp atomically
 * - Updates streak if applicable
 * - Idempotent: if task already approved/completed, returns alreadyProcessed
 * - Sends Expo push via HTTP (best-effort)
 */
export const completeTaskTransaction = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');

  const callerUid = context.auth.uid;
  const { taskId, childUid, xpValue } = data as { taskId?: string; childUid?: string; xpValue?: number };

  if (!taskId || !childUid || typeof xpValue !== 'number') {
    throw new functions.https.HttpsError('invalid-argument', 'taskId, childUid and numeric xpValue are required.');
  }

  const db = admin.firestore();
  const callerRef = db.collection('Users').doc(callerUid);
  const childRef = db.collection('Users').doc(childUid);
  const taskRef = db.collection('Tasks').doc(taskId);

  return await db.runTransaction(async (tx) => {
    const [callerSnap, childSnap, taskSnap] = await Promise.all([
      tx.get(callerRef),
      tx.get(childRef),
      tx.get(taskRef),
    ]);

    if (!callerSnap.exists) throw new functions.https.HttpsError('not-found', 'Caller profile not found.');
    if (!childSnap.exists) throw new functions.https.HttpsError('not-found', 'Child profile not found.');
    if (!taskSnap.exists) throw new functions.https.HttpsError('not-found', 'Task not found.');

    const caller = callerSnap.data() as any;
    const child = childSnap.data() as any;
    const task = taskSnap.data() as any;

    if (caller.role !== 'parent') throw new functions.https.HttpsError('permission-denied', 'Only parents can approve tasks.');
    if (!caller.familyId || caller.familyId !== child.familyId) throw new functions.https.HttpsError('permission-denied', 'Parent and child must share a familyId.');
    if (task.assignedToUid !== childUid || task.familyId !== caller.familyId) throw new functions.https.HttpsError('failed-precondition', 'Task not assigned to child or not in family.');

    // Idempotency: check if already approved/completed
    if (task.status === 'completed' || task.approvedAt || task.status === 'approved') {
      return { success: true, alreadyProcessed: true };
    }

    const nowDate = new Date();

    // Streak logic
    const lastCompletedAt: admin.firestore.Timestamp | undefined = child.lastCompletedAt;
    let newStreak = 1;
    let bestStreak = child.bestStreak || 0;

    if (lastCompletedAt) {
      const last = lastCompletedAt.toDate();
      const today = new Date();
      const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate()).getTime();
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const diffDays = Math.round((todayDay - lastDay) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
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
      approvedAt: nowDate,
      approvedBy: callerUid,
      updatedAt: nowDate,
    });

    tx.update(childRef, {
      totalXp: (child.totalXp || 0) + xpValue,
      tasksCompleted: (child.tasksCompleted || 0) + 1,
      lastCompletedAt: nowDate,
      currentStreak: newStreak,
      bestStreak: bestStreak,
    });

      // Fire-and-forget notification to Expo push API
    const pushToken = child.expoPushToken;
    if (pushToken && typeof pushToken === 'string') {
      const payload = {
        to: pushToken,
        sound: 'default',
        title: 'Great job!',
        body: `Great job! You earned ${xpValue} points!`,
        data: { taskId, xp: xpValue },
      };

      setTimeout(async () => {
        try {
          await axios.post('https://exp.host/--/api/v2/push/send', payload, { headers: { 'Content-Type': 'application/json' }, timeout: 5000 });
        } catch (err) {
          console.warn('Expo push failed:', err && err.toString ? err.toString() : err);
        }
      }, 0);
    }

      return { success: true, xpAwarded: xpValue };
    });
  });
