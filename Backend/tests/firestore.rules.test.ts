import * as fs from 'fs';
import * as path from 'path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = 'kidquest-rules-production-test';
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const firestoreRules = fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8');
  const storageRules = fs.readFileSync(path.resolve(__dirname, '../storage.rules'), 'utf8');

  const [host, portStr] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
  const port = parseInt(portStr || '8080', 10);

  const [sHost, sPortStr] = (process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199').split(':');
  const sPort = parseInt(sPortStr || '9199', 10);

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: firestoreRules,
      host,
      port,
    },
    storage: {
      rules: storageRules,
      host: sHost,
      port: sPort,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  if (testEnv.clearStorage) {
    await testEnv.clearStorage();
  }

  // Seed fixtures via Admin SDK (bypasses security rules)
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    // 1. Linked Parent & Kid
    await setDoc(doc(db, 'Users', 'parent_1'), {
      role: 'parent',
      name: 'Sarah Parent',
      email: 'parent1@example.com',
      linkedKids: ['kid_1'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await setDoc(doc(db, 'Users', 'kid_1'), {
      role: 'kid',
      name: 'Alice Kid',
      linkedParentId: 'parent_1',
      totalXp: 150,
      lifetimeXp: 500,
      currentStreak: 3,
      bestStreak: 7,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. Unrelated Parent & Kid
    await setDoc(doc(db, 'Users', 'parent_2'), {
      role: 'parent',
      name: 'John Stranger',
      email: 'stranger@example.com',
      linkedKids: ['kid_2'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await setDoc(doc(db, 'Users', 'kid_2'), {
      role: 'kid',
      name: 'Bob Kid',
      linkedParentId: 'parent_2',
      totalXp: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4. School & Teacher Fixtures (Phase 10 Tenant Isolation)
    await setDoc(doc(db, 'Users', 'teacher_1'), {
      role: 'teacher',
      name: 'Ms. Frizzle',
      email: 'frizzle@school.edu',
      teacherOf: ['kid_1'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await setDoc(doc(db, 'Users', 'teacher_2'), {
      role: 'teacher',
      name: 'Mr. Ratburn',
      email: 'ratburn@school.edu',
      teacherOf: ['kid_2'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await setDoc(doc(db, 'Classes', 'class_science_4a'), {
      name: 'Grade 4 Science',
      subject: 'Science',
      grade: '4',
      teacherUid: 'teacher_1',
      studentUids: ['kid_1'],
      createdAt: new Date(),
    });

    await setDoc(doc(db, 'Classes', 'class_history_5b'), {
      name: 'Grade 5 History',
      subject: 'History',
      grade: '5',
      teacherUid: 'teacher_2',
      studentUids: ['kid_2'],
      createdAt: new Date(),
    });

    // 3. Baseline Task for Alice
    await setDoc(doc(db, 'Tasks', 'task_101'), {
      title: 'Clean Bedroom',
      description: 'Make bed and pick up toys',
      category: 'chores',
      difficulty: 'easy',
      xp: 25,
      assignedToUid: 'kid_1',
      assignedToName: 'Alice Kid',
      parentId: 'parent_1',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

describe('KidQuest Authoritative Security Rules Test Suite (Phase 3)', () => {

  // =========================================================================
  // 1. USERS COLLECTION & ANTI-CHEAT
  // =========================================================================

  test('[PASS] Parent can read their own profile and their linked kid profile', async () => {
    const db = testEnv.authenticatedContext('parent_1', { role: 'parent' }).firestore();
    await assertSucceeds(getDoc(doc(db, 'Users', 'parent_1')));
    await assertSucceeds(getDoc(doc(db, 'Users', 'kid_1')));
  });

  test('[FAIL] Stranger parent CANNOT read unrelated kid profile', async () => {
    const db = testEnv.authenticatedContext('parent_2', { role: 'parent' }).firestore();
    await assertFails(getDoc(doc(db, 'Users', 'kid_1')));
  });

  test('[FAIL] Child CANNOT elevate own role to admin or parent', async () => {
    const db = testEnv.authenticatedContext('kid_1', { role: 'kid' }).firestore();
    await assertFails(
      updateDoc(doc(db, 'Users', 'kid_1'), {
        role: 'admin',
      })
    );
  });

  test('[FAIL] Child CANNOT directly modify their own totalXp or streak (Anti-Cheat)', async () => {
    const db = testEnv.authenticatedContext('kid_1', { role: 'kid' }).firestore();
    await assertFails(
      updateDoc(doc(db, 'Users', 'kid_1'), {
        totalXp: 999999,
      })
    );
    await assertFails(
      updateDoc(doc(db, 'Users', 'kid_1'), {
        currentStreak: 100,
      })
    );
  });

  test('[PASS] Child can update allowed profile fields (name, avatarEmoji)', async () => {
    const db = testEnv.authenticatedContext('kid_1', { role: 'kid' }).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'Users', 'kid_1'), {
        name: 'Alice The Brave',
        avatarEmoji: '🦊',
      })
    );
  });

  // =========================================================================
  // 2. TASKS: PARENT TASK CREATION & CHILD PROOF SUBMISSION (SEC-03 & SEC-04)
  // =========================================================================

  test('[PASS - FIXES SEC-03] Parent CAN create and assign tasks to their linked kid', async () => {
    const db = testEnv.authenticatedContext('parent_1', { role: 'parent' }).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'Tasks', 'task_102'), {
        title: 'Complete 30 mins math homework',
        category: 'homework',
        difficulty: 'medium',
        xp: 50,
        assignedToUid: 'kid_1',
        assignedToName: 'Alice Kid',
        parentId: 'parent_1',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
  });

  test('[FAIL] Parent CANNOT assign task with invalid payload or missing fields', async () => {
    const db = testEnv.authenticatedContext('parent_1', { role: 'parent' }).firestore();
    await assertFails(
      setDoc(doc(db, 'Tasks', 'task_invalid'), {
        title: 'Invalid Task',
        // missing assignedToUid, category, difficulty, xp, parentId, status
      })
    );
  });

  test('[PASS] Assigned kid can submit photo proof and update status to pending_approval', async () => {
    const db = testEnv.authenticatedContext('kid_1', { role: 'kid' }).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'Tasks', 'task_101'), {
        status: 'pending_approval',
        proofUrl: 'https://firebasestorage.googleapis.com/v0/b/app/o/proof.jpg',
        proofNote: 'Done cleaning my room Mom!',
        updatedAt: new Date(),
      })
    );
  });

  test('[FAIL - ANTI-CHEAT] Child CANNOT directly mark task completed (self-approval blocked)', async () => {
    const db = testEnv.authenticatedContext('kid_1', { role: 'kid' }).firestore();
    await assertFails(
      updateDoc(doc(db, 'Tasks', 'task_101'), {
        status: 'completed',
      })
    );
  });

  test('[PASS] Parent CAN approve task after review and mark completed', async () => {
    const db = testEnv.authenticatedContext('parent_1', { role: 'parent' }).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'Tasks', 'task_101'), {
        status: 'completed',
        parentNote: 'Awesome job Alice!',
        finalXp: 25,
        updatedAt: new Date(),
      })
    );
  });

  // =========================================================================
  // 3. XP LEDGER (SERVER-AUTHORITATIVE)
  // =========================================================================

  test('[FAIL] Client CANNOT write directly to XpLedger', async () => {
    const db = testEnv.authenticatedContext('kid_1', { role: 'kid' }).firestore();
    await assertFails(
      setDoc(doc(db, 'XpLedger', 'entry_hacked'), {
        kidUid: 'kid_1',
        amount: 5000,
        type: 'bonus_awarded',
        description: 'Hacked XP',
        timestamp: new Date(),
      })
    );
  });

  // =========================================================================
  // 4. STORAGE RULES: CHILD PHOTO PRIVACY (SEC-02)
  // =========================================================================

  test('[FAIL - FIXES SEC-02] Stranger CANNOT read child task photos without authorization', async () => {
    const strangerStorage = testEnv.authenticatedContext('parent_2', { role: 'parent' }).storage();
    const photoRef = strangerStorage.ref('task-photos/task_101/proof.jpg');
    // Stranger is not party to task_101
    await assertFails(photoRef.getBytes());
  });
  // =========================================================================
  // 5. SCHOOL PORTAL: TEACHER & CLASS MULTI-TENANT ISOLATION (PHASE 10)
  // =========================================================================
  describe('Phase 10: School Portal Teacher & Class Tenant Isolation', () => {
    test('[PASS] Teacher can read their own assigned class document', async () => {
      const db = testEnv.authenticatedContext('teacher_1', { role: 'teacher' }).firestore();
      await assertSucceeds(getDoc(doc(db, 'Classes', 'class_science_4a')));
    });

    test('[FAIL - TENANT ISOLATION] Teacher CANNOT read another teacher\'s class', async () => {
      const db = testEnv.authenticatedContext('teacher_1', { role: 'teacher' }).firestore();
      await assertFails(getDoc(doc(db, 'Classes', 'class_history_5b')));
    });

    test('[PASS] Teacher can read student profile enrolled in their class', async () => {
      const db = testEnv.authenticatedContext('teacher_1', { role: 'teacher' }).firestore();
      await assertSucceeds(getDoc(doc(db, 'Users', 'kid_1')));
    });

    test('[FAIL - STUDENT PRIVACY] Teacher CANNOT read student profile from another class', async () => {
      const db = testEnv.authenticatedContext('teacher_1', { role: 'teacher' }).firestore();
      await assertFails(getDoc(doc(db, 'Users', 'kid_2')));
    });

    test('[PASS] Teacher CAN create/assign homework task to student in their class', async () => {
      const db = testEnv.authenticatedContext('teacher_1', { role: 'teacher' }).firestore();
      await assertSucceeds(
        setDoc(doc(db, 'Tasks', 'task_school_101'), {
          title: 'Solar System Diorama',
          category: 'homework',
          difficulty: 'medium',
          xp: 75,
          assignedToUid: 'kid_1',
          parentId: 'teacher_1',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );
    });

    test('[FAIL] Teacher CANNOT assign task to student of another teacher', async () => {
      const db = testEnv.authenticatedContext('teacher_1', { role: 'teacher' }).firestore();
      await assertFails(
        setDoc(doc(db, 'Tasks', 'task_unauthorized_202'), {
          title: 'Unauthorized Assignment',
          category: 'homework',
          difficulty: 'hard',
          xp: 100,
          assignedToUid: 'kid_2',
          parentId: 'teacher_1',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );
    });

    test('[FAIL] Teacher CANNOT modify or delete another teacher\'s class', async () => {
      const db = testEnv.authenticatedContext('teacher_1', { role: 'teacher' }).firestore();
      await assertFails(
        updateDoc(doc(db, 'Classes', 'class_history_5b'), {
          name: 'Hacked Class',
        })
      );
    });
  });
});