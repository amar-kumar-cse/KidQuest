import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import type { Task, CreateTaskInput } from '../types';

// ─── Task Service ─────────────────────────────────────────────────────────────

export const taskService = {
  /**
   * Create a new task in Firestore.
   * Returns the new task document ID.
   */
  async createTask(parentId: string, input: CreateTaskInput): Promise<string> {
    const docRef = await addDoc(collection(db, 'Tasks'), {
      title: input.title,
      description: input.description,
      category: input.category,
      difficulty: input.difficulty,
      xp: input.xp,
      assignedToUid: input.assignedToUid,
      assignedToName: input.assignedToName,
      assignedTo: input.assignedToName,  // legacy compat
      parentId,
      status: 'pending',
      dueDate: Timestamp.fromDate(input.dueDate),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  /**
   * Real-time subscription to all tasks for a parent.
   * Returns unsubscribe function.
   */
  subscribeToParentTasks(
    parentId: string,
    callback: (tasks: Task[]) => void,
  ): () => void {
    const q = query(
      collection(db, 'Tasks'),
      where('parentId', '==', parentId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    return onSnapshot(q, (snap) => {
      const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
      callback(tasks);
    });
  },

  /**
   * Real-time subscription to all tasks assigned to a kid.
   * Returns unsubscribe function.
   */
  subscribeToKidTasks(
    kidId: string,
    callback: (tasks: Task[]) => void,
  ): () => void {
    const q = query(
      collection(db, 'Tasks'),
      where('assignedToUid', '==', kidId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    return onSnapshot(q, (snap) => {
      const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
      callback(tasks);
    });
  },

  /**
   * Subscribe to parent tasks filtered by status array.
   */
  subscribeParentTasksByStatus(
    parentId: string,
    statuses: Task['status'][],
    callback: (tasks: Task[]) => void,
  ): () => void {
    const q = query(
      collection(db, 'Tasks'),
      where('parentId', '==', parentId),
      where('status', 'in', statuses),
    );
    return onSnapshot(q, (snap) => {
      const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
      callback(tasks);
    });
  },

  /**
   * Submit proof for a task (kid action — client-side write).
   * Only updates status, proofUrl, proofNote, completedAt.
   */
  async submitProof(
    taskId: string,
    proofUrl: string,
    proofNote?: string,
  ): Promise<void> {
    await updateDoc(doc(db, 'Tasks', taskId), {
      status: 'pending_approval',
      proofUrl,
      proofNote: proofNote ?? null,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Approve a task via Cloud Function (handles XP + streak transaction).
   */
  async approveTask(taskId: string, bonusXp: number = 0): Promise<void> {
    const fn = httpsCallable(functions, 'approveTask');
    await fn({ taskId, bonusXp });
  },

  /**
   * Reject a task via Cloud Function (resets to pending for retry).
   */
  async rejectTask(taskId: string, parentNote: string = ''): Promise<void> {
    const fn = httpsCallable(functions, 'rejectTask');
    await fn({ taskId, parentNote });
  },

  /**
   * Delete a task (only parent, only non-completed tasks per Firestore rules).
   */
  async deleteTask(taskId: string): Promise<void> {
    await deleteDoc(doc(db, 'Tasks', taskId));
  },

  /**
   * Update task fields (parent only).
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    await updateDoc(doc(db, 'Tasks', taskId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Fetch all tasks for a parent (one-shot, not real-time).
   */
  async getParentTasks(parentId: string): Promise<Task[]> {
    const q = query(collection(db, 'Tasks'), where('parentId', '==', parentId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
  },
};
