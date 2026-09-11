import * as fs from 'fs';
import * as path from 'path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = 'kidquest-rules-test';
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const rulesPath = path.resolve(__dirname, '../firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8083,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // Seed baseline system fixtures via Admin SDK (bypasses security rules)
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    // Child 1
    await setDoc(doc(db, 'users', 'child_1'), {
      role: 'child',
      name: 'Alice Kid',
      createdAt: new Date(),
    });

    // Child 2 (unrelated)
    await setDoc(doc(db, 'users', 'child_2'), {
      role: 'child',
      name: 'Bob Kid',
      createdAt: new Date(),
    });

    // Parent 1 (Parent of child_1 only)
    await setDoc(doc(db, 'users', 'parent_1'), {
      role: 'parent',
      name: 'Sarah Parent',
      parentOf: ['child_1'],
      createdAt: new Date(),
    });

    // Teacher 1 (Teacher of child_1 only)
    await setDoc(doc(db, 'users', 'teacher_1'), {
      role: 'teacher',
      name: 'Mr. Davis',
      teacherOf: ['child_1'],
      createdAt: new Date(),
    });

    // Admin
    await setDoc(doc(db, 'users', 'admin_1'), {
      role: 'admin',
      name: 'Super Admin',
      createdAt: new Date(),
    });

    // Baseline Task for Child 1
    await setDoc(doc(db, 'tasks', 'task_101'), {
      userId: 'child_1',
      subject: 'Math',
      title: 'Complete algebra worksheet',
      status: 'pending',
      completedAt: null,
      createdAt: new Date(),
    });

    // AI Suggestions for Child 1
    await setDoc(doc(db, 'suggestions', 'child_1'), {
      recommendations: ['Practice flashcards', '15 mins reading'],
      generatedAt: new Date(),
    });

    // Private Notification for Child 1
    await setDoc(doc(db, 'notifications', 'child_1', 'items', 'notif_1'), {
      title: 'Great job!',
      body: 'You completed your streak today.',
      read: false,
      createdAt: new Date(),
    });
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('KidQuest Firestore Security Rules Suite', () => {

  // =========================================================================
  // 1. USERS COLLECTION PERMISSIONS & ROLE IMMUTABILITY
  // =========================================================================

  test('[PASS] Child can read own profile', async () => {
    const db = testEnv.authenticatedContext('child_1').firestore();
    await assertSucceeds(getDoc(doc(db, 'users', 'child_1')));
  });

  test('[FAIL] Child CANNOT read another child profile', async () => {
    const db = testEnv.authenticatedContext('child_1').firestore();
    await assertFails(getDoc(doc(db, 'users', 'child_2')));
  });

  test('[FAIL] Child CANNOT change their own role to admin or parent', async () => {
    const db = testEnv.authenticatedContext('child_1').firestore();
    await assertFails(
      updateDoc(doc(db, 'users', 'child_1'), {
        role: 'admin',
      })
    );
  });

  test('[PASS] Child can update allowed profile fields (e.g., name)', async () => {
    const db = testEnv.authenticatedContext('child_1').firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'users', 'child_1'), {
        name: 'Alice Updated',
      })
    );
  });

  test('[PASS] Parent can read their own child profile via parentOf[]', async () => {
    const db = testEnv.authenticatedContext('parent_1').firestore();
    await assertSucceeds(getDoc(doc(db, 'users', 'child_1')));
  });

  test('[FAIL] Parent CANNOT read unrelated child profile', async () => {
    const db = testEnv.authenticatedContext('parent_1').firestore();
    await assertFails(getDoc(doc(db, 'users', 'child_2')));
  });

  test('[PASS] Teacher can read student profile via teacherOf[]', async () => {
    const db = testEnv.authenticatedContext('teacher_1').firestore();
    await assertSucceeds(getDoc(doc(db, 'users', 'child_1')));
  });

  test('[FAIL] Teacher CANNOT read unrelated student profile', async () => {
    const db = testEnv.authenticatedContext('teacher_1').firestore();
    await assertFails(getDoc(doc(db, 'users', 'child_2')));
  });

  // =========================================================================
  // 2. TASKS COLLECTION PERMISSIONS & FIELD VALIDATION
  // =========================================================================

  test('[PASS] Child can read their own task', async () => {
    const db = testEnv.authenticatedContext('child_1').firestore();
    await assertSucceeds(getDoc(doc(db, 'tasks', 'task_101')));
  });

  test('[FAIL] Unrelated child CANNOT read another kid task', async () => {
    const db = testEnv.authenticatedContext('child_2').firestore();
    await assertFails(getDoc(doc(db, 'tasks', 'task_101')));
  });

  test('[PASS] Parent can read their child task via parentOf[]', async () => {
    const db = testEnv.authenticatedContext('parent_1').firestore();
    await assertSucceeds(getDoc(doc(db, 'tasks', 'task_101')));
  });

  test('[FAIL] Parent CANNOT modify child task directly', async () => {
    const db = testEnv.authenticatedContext('parent_1').firestore();
    await assertFails(
      updateDoc(doc(db, 'tasks', 'task_101'), {
        status: 'done',
      })
    );
  });

  test('[PASS] Teacher can create/assign a task for their student in teacherOf[]', async () => {
    const db = testEnv.authenticatedContext('teacher_1').firestore();
    await assertSucceeds(
      setDoc(doc(db, 'tasks', 'task_102'), {
        userId: 'child_1',
        subject: 'Science',
        title: 'Solar system model',
        status: 'pending',
        completedAt: null,
        createdAt: new Date(),
      })
    );
  });

  test('[FAIL] Teacher CANNOT assign task to student NOT in teacherOf[]', async () => {
    const db = testEnv.authenticatedContext('teacher_1').firestore();
    await assertFails(
      setDoc(doc(db, 'tasks', 'task_103'), {
        userId: 'child_2',
        subject: 'History',
        title: 'Ancient Egypt',
        status: 'pending',
        completedAt: null,
        createdAt: new Date(),
      })
    );
  });

  test('[FAIL] Task write FAILS if status is not pending|done|missed', async () => {
    const db = testEnv.authenticatedContext('child_1').firestore();
    await assertFails(
      updateDoc(doc(db, 'tasks', 'task_101'), {
        status: 'invalid_status_value',
      })
    );
  });

  test('[FAIL] Task write FAILS if missing required fields', async () => {
    const db = testEnv.authenticatedContext('child_1').firestore();
    await assertFails(
      setDoc(doc(db, 'tasks', 'task_incomplete'), {
        userId: 'child_1',
        // missing 'subject', 'status', 'createdAt'
      })
    );
  });

  // =========================================================================
  // 3. AI SUGGESTIONS, NOTIFICATIONS, AND ADMIN PERMISSIONS
  // =========================================================================

  test('[PASS] Child can read own AI suggestions', async () => {
    const db = testEnv.authenticatedContext('child_1').firestore();
    await assertSucceeds(getDoc(doc(db, 'suggestions', 'child_1')));
  });

  test('[FAIL] Client CANNOT write to AI suggestions directly', async () => {
    const db = testEnv.authenticatedContext('child_1').firestore();
    await assertFails(
      setDoc(doc(db, 'suggestions', 'child_1'), {
        recommendations: ['Hacked recommendation'],
      })
    );
  });

  test('[PASS] Child can read their own private notifications', async () => {
    const db = testEnv.authenticatedContext('child_1').firestore();
    await assertSucceeds(getDoc(doc(db, 'notifications', 'child_1', 'items', 'notif_1')));
  });

  test('[FAIL] Other users CANNOT read private notifications', async () => {
    const db = testEnv.authenticatedContext('child_2').firestore();
    await assertFails(getDoc(doc(db, 'notifications', 'child_1', 'items', 'notif_1')));
  });

  test('[PASS] Admin has full write access across collections', async () => {
    const db = testEnv.authenticatedContext('admin_1').firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'users', 'child_1'), {
        role: 'child',
        name: 'Alice by Admin',
      })
    );
  });
});
