// Minimal end-to-end smoke test using Admin SDK against Firestore emulator.
// Creates a parent and child, a task assigned to the child, then runs
// a transaction to approve the task and increments child's XP.

const admin = require('firebase-admin');

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8082';

admin.initializeApp({ projectId: 'demo-no-project' });
const db = admin.firestore();

async function run() {
  const parentId = 'parent_abc';
  const childId = 'child_xyz';
  const familyId = 'family_1';

  // Create users
  await db.collection('Users').doc(parentId).set({ uid: parentId, name: 'Parent', role: 'parent', familyId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  await db.collection('Users').doc(childId).set({ uid: childId, name: 'Child', role: 'kid', familyId, totalXp: 0, currentStreak: 0, bestStreak: 0, createdAt: admin.firestore.FieldValue.serverTimestamp() });

  // Create task
  const taskRef = db.collection('Tasks').doc();
  const taskData = {
    title: 'Make Bed',
    description: 'Tidy up bed in morning',
    xp: 10,
    status: 'pending',
    parentId,
    assignedToUid: childId,
    familyId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await taskRef.set(taskData);

  console.log('Created parent, child, and task:', parentId, childId, taskRef.id);

  // Simulate approval transaction (like completeTaskTransaction)
  const xpValue = 10;
  await db.runTransaction(async (tx) => {
    const taskSnap = await tx.get(taskRef);
    const childRef = db.collection('Users').doc(childId);
    const childSnap = await tx.get(childRef);

    if (!taskSnap.exists) throw new Error('task not found');
    if (!childSnap.exists) throw new Error('child not found');

    const task = taskSnap.data();
    const child = childSnap.data();

    if (task.status === 'completed') {
      console.log('Task already completed');
      return;
    }

    const now = admin.firestore.Timestamp.now();

    tx.update(taskRef, { status: 'completed', approvedAt: now, approvedBy: parentId, updatedAt: now });
    tx.update(childRef, { totalXp: admin.firestore.FieldValue.increment(xpValue), tasksCompleted: admin.firestore.FieldValue.increment(1), lastCompletedAt: now });
  });

  // Verify
  const updatedChild = await db.collection('Users').doc(childId).get();
  console.log('Child after approval:', updatedChild.data());

  const updatedTask = await db.collection('Tasks').doc(taskRef.id).get();
  console.log('Task after approval:', updatedTask.data());
}

run().then(() => { console.log('E2E test completed'); process.exit(0); }).catch((err) => { console.error('E2E test failed', err); process.exit(1); });
