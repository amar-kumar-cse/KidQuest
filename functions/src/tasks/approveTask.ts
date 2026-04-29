import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { calculateLevel } from '../utils/xp';
import { updateStreak } from '../utils/streak';

/**
 * Approve a task — awards XP to kid, updates streak, marks task completed.
 * Runs in a Firestore transaction to prevent race conditions.
 */
export const approveTask = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
  }

  const { taskId, bonusXp = 0 } = data as { taskId: string; bonusXp?: number };

  if (!taskId || typeof taskId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'taskId is required.');
  }

  const db = admin.firestore();

  await db.runTransaction(async (tx) => {
    const taskRef = db.collection('Tasks').doc(taskId);
    const taskSnap = await tx.get(taskRef);

    if (!taskSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Task not found.');
    }

    const task = taskSnap.data()!;

    // Only the parent who owns this task can approve it
    if (task.parentId !== context.auth!.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Not the task owner.');
    }

    if (task.status !== 'pending_approval') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Task status is "${task.status}", expected "pending_approval".`,
      );
    }

    const kidRef = db.collection('Users').doc(task.assignedToUid);
    const kidSnap = await tx.get(kidRef);

    if (!kidSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Kid profile not found.');
    }

    const kid = kidSnap.data()!;
    const finalXp = (task.xp as number) + (bonusXp as number);
    const newTotalXp = (kid.totalXp as number || 0) + finalXp;
    const newLevel = calculateLevel(newTotalXp);
    const streakData = updateStreak(
      kid.lastActivityDate as string | undefined,
      kid.currentStreak as number || 0,
      kid.bestStreak as number || 0,
    );

    // Update task to completed
    tx.update(taskRef, {
      status: 'completed',
      finalXp,
      bonusXp,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update kid's XP, level, and streak atomically
    tx.update(kidRef, {
      totalXp: newTotalXp,
      level: newLevel,
      tasksCompleted: admin.firestore.FieldValue.increment(1),
      currentStreak: streakData.currentStreak,
      bestStreak: streakData.bestStreak,
      lastActivityDate: streakData.today,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { success: true };
});
