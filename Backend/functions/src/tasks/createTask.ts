import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getAdminConfig } from '../admin/adminConfig';

/**
 * createTask callable
 * - Parents must call this to create tasks server-side to enforce limits.
 * - Params: { title, description, xp, assignedToUid, dueDate }
 */
export const createTask = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
  const callerUid = context.auth.uid;
  const { title, description, xp, assignedToUid, dueDate } = data as any;

  if (!title || !description || typeof xp !== 'number' || !assignedToUid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required task fields.');
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

    // Enforce per-kid task limit (active tasks). Try adminConfig, fall back to env/default.
    const cfg = await getAdminConfig(db);
    const MAX_ACTIVE_TASKS = cfg.MAX_ACTIVE_TASKS || parseInt(process.env.MAX_ACTIVE_TASKS || '10', 10);
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
      description,
      xp,
      status: 'pending',
      parentId: callerUid,
      assignedToUid,
      familyId: caller.familyId,
      createdAt: now,
      dueDate: dueDate || null,
    });

    return { success: true, taskId: taskRef.id };
  });
});
