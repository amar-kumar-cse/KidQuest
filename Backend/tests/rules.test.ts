import * as fs from 'fs';
import * as path from 'path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = 'kidquest-rules-spec-test';
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

  // Setup seed environment with security rules disabled
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    // 1. Children
    await setDoc(doc(db, 'users', 'kid_alice'), {
      role: 'child',
      name: 'Alice',
      createdAt: new Date(),
    });

    await setDoc(doc(db, 'users', 'kid_bob'), {
      role: 'child',
      name: 'Bob',
      createdAt: new Date(),
    });

    // 2. Parents
    await setDoc(doc(db, 'users', 'parent_alice'), {
      role: 'parent',
      name: 'Alice Parent',
      parentOf: ['kid_alice'],
      createdAt: new Date(),
    });

    await setDoc(doc(db, 'users', 'parent_bob'), {
      role: 'parent',
      name: 'Bob Parent',
      parentOf: ['kid_bob'],
      createdAt: new Date(),
    });

    // 3. Teachers
    await setDoc(doc(db, 'users', 'teacher_smith'), {
      role: 'teacher',
      name: 'Mrs. Smith',
      teacherOf: ['kid_alice'], // Alice is in class, Bob is not
      createdAt: new Date(),
    });

    // 4. Initial tasks
    await setDoc(doc(db, 'tasks', 'task_alice_1'), {
      userId: 'kid_alice',
      subject: 'Math',
      title: 'Practice Times Tables',
      status: 'pending',
      completedAt: null,
      createdAt: new Date(),
    });

    await setDoc(doc(db, 'tasks', 'task_bob_1'), {
      userId: 'kid_bob',
      subject: 'Reading',
      title: 'Read chapter 3',
      status: 'pending',
      completedAt: null,
      createdAt: new Date(),
    });
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Firestore Security Rules - Core Specification Tests', () => {

  // ─── Rule 1: Child can only read/write own tasks (not other kids) ───────────
  describe('Rule 1: Child task isolation', () => {
    it('allows a child to read their own task', async () => {
      const db = testEnv.authenticatedContext('kid_alice').firestore();
      await assertSucceeds(getDoc(doc(db, 'tasks', 'task_alice_1')));
    });

    it('blocks a child from reading another child task', async () => {
      const db = testEnv.authenticatedContext('kid_alice').firestore();
      await assertFails(getDoc(doc(db, 'tasks', 'task_bob_1')));
    });

    it('allows a child to update their own task status', async () => {
      const db = testEnv.authenticatedContext('kid_alice').firestore();
      await assertSucceeds(
        updateDoc(doc(db, 'tasks', 'task_alice_1'), {
          status: 'done',
        })
      );
    });

    it('blocks a child from writing/updating another child task', async () => {
      const db = testEnv.authenticatedContext('kid_alice').firestore();
      await assertFails(
        updateDoc(doc(db, 'tasks', 'task_bob_1'), {
          status: 'done',
        })
      );
    });
  });

  // ─── Rule 2: Parent can read their children tasks (not other parents' kids) ─
  describe('Rule 2: Parent access scoped to parentOf[]', () => {
    it('allows a parent to read their own child task', async () => {
      const db = testEnv.authenticatedContext('parent_alice').firestore();
      await assertSucceeds(getDoc(doc(db, 'tasks', 'task_alice_1')));
    });

    it('blocks a parent from reading another parent child task', async () => {
      const db = testEnv.authenticatedContext('parent_alice').firestore();
      await assertFails(getDoc(doc(db, 'tasks', 'task_bob_1')));
    });
  });

  // ─── Rule 3: Teacher can read students in their class ────────────────────────
  describe('Rule 3: Teacher access scoped to teacherOf[]', () => {
    it('allows a teacher to read tasks of a student enrolled in teacherOf[]', async () => {
      const db = testEnv.authenticatedContext('teacher_smith').firestore();
      await assertSucceeds(getDoc(doc(db, 'tasks', 'task_alice_1')));
    });

    it('blocks a teacher from reading tasks of a student NOT in teacherOf[]', async () => {
      const db = testEnv.authenticatedContext('teacher_smith').firestore();
      await assertFails(getDoc(doc(db, 'tasks', 'task_bob_1')));
    });

    it('allows a teacher to assign a task to a student in their class', async () => {
      const db = testEnv.authenticatedContext('teacher_smith').firestore();
      await assertSucceeds(
        setDoc(doc(db, 'tasks', 'task_alice_new'), {
          userId: 'kid_alice',
          subject: 'Science',
          title: 'Volcano Experiment',
          status: 'pending',
          completedAt: null,
          createdAt: new Date(),
        })
      );
    });
  });

  // ─── Rule 4: Unauthenticated users blocked from everything ───────────────────
  describe('Rule 4: Unauthenticated request rejection', () => {
    it('blocks unauthenticated requests from reading tasks', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, 'tasks', 'task_alice_1')));
    });

    it('blocks unauthenticated requests from writing tasks', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(
        setDoc(doc(db, 'tasks', 'task_anon'), {
          userId: 'kid_alice',
          subject: 'Math',
          status: 'pending',
          createdAt: new Date(),
        })
      );
    });

    it('blocks unauthenticated requests from reading user profiles', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, 'users', 'kid_alice')));
    });
  });
});
