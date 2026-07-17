import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getAdminConfig } from '../admin/adminConfig';

/**
 * createTask callable
 * - Parents must call this to create tasks server-side to enforce limits.
 */
export const createTask = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
  const callerUid = context.auth.uid;
  const { title, description, xp, assignedToUid, assignedTo, dueDate, category, icon, difficulty, dueInHours } = data as any;

  if (!title || typeof xp !== 'number' || !assignedToUid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required task fields (title, xp, assignedToUid).');
  }

  const db = admin.firestore();
  const callerRef = db.collection('Users').doc(callerUid);
  const kidRef = db.collection('Users').doc(assignedToUid);

  return db.runTransaction(async (tx) => {
    const [callerSnap, kidSnap] = await Promise.all([tx.get(callerRef), tx.get(kidRef)]);
    if (!callerSnap.exists) throw new functions.https.HttpsError('not-found', 'Caller not found');
    if (!kidSnap.exists) throw new functions.https.HttpsError('not-found', 'Assigned kid not found');

    const caller = callerSnap.data() as any;
    const kid = kidSnap.data() as any;

    if (caller.role !== 'parent') throw new functions.https.HttpsError('permission-denied', 'Only parents can create tasks');
    if (!caller.familyId || caller.familyId !== kid.familyId) throw new functions.https.HttpsError('permission-denied', 'Parent and kid must share a family');

    // Rate Limiting: Prevent spamming task creations
    const currentTime = admin.firestore.Timestamp.now();
    if (caller.lastTaskCreatedAt) {
      const secondsSinceLastCreate = currentTime.seconds - caller.lastTaskCreatedAt.seconds;
      if (secondsSinceLastCreate < 5) { // 5 second cooldown
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'Please wait a moment before creating another task.',
        );
      }
    }

    // Enforce per-kid task limit (active tasks). Try adminConfig, fall back to env/default.
    const cfg = await getAdminConfig(db);
    const MAX_ACTIVE_TASKS = cfg.MAX_ACTIVE_TASKS || parseInt(process.env.MAX_ACTIVE_TASKS || '10', 10);
    
    // Check limit outside transaction if needed, but doing inside is fine for query sizes if small
    // Actually, queries in transactions must be done carefully, but since it's a small app:
    const activeTasksSnap = await db.collection('Tasks')
      .where('assignedToUid', '==', assignedToUid)
      .where('status', 'in', ['pending', 'pending_approval'])
      .get();

    if (activeTasksSnap.size >= MAX_ACTIVE_TASKS) {
      throw new functions.https.HttpsError('resource-exhausted', `Assigned kid already has ${activeTasksSnap.size} active tasks (limit ${MAX_ACTIVE_TASKS}).`);
    }

    const taskRef = db.collection('Tasks').doc();
    const now = admin.firestore.FieldValue.serverTimestamp();
    tx.set(taskRef, {
      title,
      description: description || '',
      xp,
      difficulty: difficulty || 'easy',
      bonusXp: 0,
      finalXp: xp,
      assignedTo: assignedTo || kid.name || 'Kid',
      assignedToUid,
      parentId: callerUid,
      familyId: caller.familyId,
      status: 'pending',
      proofUrl: null,
      icon: icon || '📝',
      category: category || 'other',
      frequency: data.frequency || 'once', // NEW: recurring support
      dueInHours: dueInHours ?? null,
      dueDate: dueDate || null,
      createdAt: now,
      completedAt: null,
      approvedAt: null,
    });

    // Update parent's lastTaskCreatedAt
    tx.update(callerRef, {
      lastTaskCreatedAt: now,
    });

    return { success: true, taskId: taskRef.id };
  });
});
