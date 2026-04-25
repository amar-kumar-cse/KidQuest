import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
  runTransaction,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import {
  notifyParentTaskCompleted,
  notifyKidTaskApproved,
  notifyKidTaskRejected,
} from './notificationService';
import {
  calculateFinalXp,
  TaskDifficulty,
  DIFFICULTY_MULTIPLIERS,
} from './constants';

// ─── Types ───────────────────────────────────────────────────────────
export type TaskStatus   = 'pending' | 'pending_approval' | 'completed' | 'rejected';
export type TaskCategory = 'homework' | 'chores' | 'reading' | 'exercise' | 'other';
export type { TaskDifficulty };

export interface TaskData {
  title          : string;
  description    : string;
  xp             : number;         // Base XP set by parent
  difficulty     : TaskDifficulty; // Multiplier tier
  bonusXp        : number;         // Time-speed bonus (earned on completion)
  finalXp        : number;         // Total awarded: round(base × difficulty) + streakBonus + bonusXp
  assignedTo     : string;         // Kid's display name
  assignedToUid  : string;         // Kid's Firebase UID
  parentId       : string;         // Parent's Firebase UID
  status         : TaskStatus;
  proofUrl       : string | null;
  icon           : string;
  category       : TaskCategory;
  dueInHours     : number | null;
  createdAt      : any;
  completedAt    : any | null;
  approvedAt     : any | null;
}

export interface CreateTaskInput {
  title         : string;
  description?  : string;
  xp            : number;
  difficulty?   : TaskDifficulty;
  assignedTo?   : string;
  assignedToUid?: string;
  category?     : TaskCategory;
  icon?         : string;
  dueInHours?   : number;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function requireAuth(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User is not authenticated. Please log in again.');
  return uid;
}

export function getFirebaseErrorMessage(error: any): string {
  const code: string = error?.code || '';
  const map: Record<string, string> = {
    'auth/invalid-email'         : 'Email address is not valid.',
    'auth/user-disabled'         : 'This account has been disabled.',
    'auth/user-not-found'        : 'No account found with this email.',
    'auth/wrong-password'        : 'Incorrect password. Please try again.',
    'auth/email-already-in-use'  : 'An account already exists with this email.',
    'auth/weak-password'         : 'Password must be at least 6 characters.',
    'auth/too-many-requests'     : 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Check your internet connection.',
    'permission-denied'          : 'You do not have permission to perform this action.',
    'not-found'                  : 'The requested data was not found.',
    'unavailable'                : 'Service is temporarily unavailable. Please try again.',
  };
  return map[code] || error?.message || 'Something went wrong. Please try again.';
}

// ─── Time-Speed Bonus XP ─────────────────────────────────────────────

/**
 * Bonus XP for completing a task quickly.
 * ≤1h → +20%  |  ≤2h → +10%  |  ≤3h → +5%  |  >3h → 0
 */
export function calculateTimeBonusXp(
  createdAt   : Timestamp | null,
  completedAt : Date,
  baseXp      : number,
): { bonusXp: number; bonusLabel: string } {
  if (!createdAt) return { bonusXp: 0, bonusLabel: '' };
  const diffHours = (completedAt.getTime() - createdAt.toDate().getTime()) / 3_600_000;

  if (diffHours <= 1) {
    const b = Math.round(baseXp * 0.2);
    return { bonusXp: b, bonusLabel: `⚡ Speed Demon! +${b} bonus XP` };
  }
  if (diffHours <= 2) {
    const b = Math.round(baseXp * 0.1);
    return { bonusXp: b, bonusLabel: `🔥 Quick Thinker! +${b} bonus XP` };
  }
  if (diffHours <= 3) {
    const b = Math.round(baseXp * 0.05);
    return { bonusXp: b, bonusLabel: `✅ On Time! +${b} bonus XP` };
  }
  return { bonusXp: 0, bonusLabel: '💪 Keep it up!' };
}

// ─── Task CRUD ───────────────────────────────────────────────────────

/**
 * Parent creates a task.
 * Queries on kid side use assignedToUid (not name) for reliable real-time sync.
 */
export async function createTask(input: CreateTaskInput): Promise<string> {
  const parentId = requireAuth();
  if (!input.title?.trim()) throw new Error('Task title is required.');
  if (input.xp < 1 || input.xp > 9999) throw new Error('XP must be between 1 and 9999.');

  const taskData: TaskData = {
    title        : input.title.trim(),
    description  : input.description?.trim() || '',
    xp           : input.xp,
    difficulty   : input.difficulty || 'easy',
    bonusXp      : 0,
    finalXp      : input.xp, // provisional — recalculated on approval
    assignedTo   : input.assignedTo?.trim() || 'Kid',
    assignedToUid: input.assignedToUid || '',
    parentId,
    status       : 'pending',
    proofUrl     : null,
    icon         : input.icon || '📝',
    category     : input.category || 'other',
    dueInHours   : input.dueInHours ?? null,
    createdAt    : serverTimestamp(),
    completedAt  : null,
    approvedAt   : null,
  };

  const docRef = await addDoc(collection(db, 'Tasks'), taskData);
  return docRef.id;
}

/**
 * Kid marks a task done.
 * - Uploads proof photo (if URI provided) via storageService
 * - Calculates time-speed bonus XP
 * - Status: pending → pending_approval
 */
export async function markTaskDone(
  taskId            : string,
  photoUri?         : string,
  onUploadProgress? : (pct: number) => void,
): Promise<{ bonusXp: number; bonusLabel: string }> {
  if (!taskId) throw new Error('Task ID is required.');

  const taskRef  = doc(db, 'Tasks', taskId);
  const taskSnap = await getDoc(taskRef);
  if (!taskSnap.exists()) throw new Error('Task not found.');

  const data = taskSnap.data();
  if (data.status !== 'pending') {
    throw new Error(`Cannot complete a task with status: ${data.status}`);
  }

  // 1️⃣ Upload photo (lazy import to avoid circular dependency)
  let proofUrl: string | null = null;
  if (photoUri) {
    try {
      const { uploadProofPhoto } = await import('./storageService');
      proofUrl = await uploadProofPhoto(taskId, photoUri, onUploadProgress);
    } catch (e) {
      console.warn('[markTaskDone] Photo upload failed, continuing without proof:', e);
    }
  }

  // 2️⃣ Time-speed bonus
  const completedAt            = new Date();
  const { bonusXp, bonusLabel } = calculateTimeBonusXp(
    data.createdAt as Timestamp,
    completedAt,
    data.xp,
  );

  // 3️⃣ Persist
  await updateDoc(taskRef, {
    status     : 'pending_approval' as TaskStatus,
    proofUrl,
    bonusXp,
    completedAt: serverTimestamp(),
  });

  // 4️⃣ Notify parent (non-blocking)
  notifyParentTaskCompleted(data.assignedTo || 'Kid', data.title).catch((e) =>
    console.warn('[Notification] Failed to notify parent:', e),
  );

  return { bonusXp, bonusLabel };
}

/**
 * Parent approves a task.
 * Reward Engine Formula:
 *   finalXp = round(baseXp × difficultyMultiplier) + streakBonus + bonusXp
 * Atomically updates task, kid XP, and kid streak in one Firestore transaction.
 */
export async function approveTask(taskId: string): Promise<void> {
  if (!taskId) throw new Error('Task ID is required.');

  await runTransaction(db, async (transaction) => {
    const taskRef  = doc(db, 'Tasks', taskId);
    const taskSnap = await transaction.get(taskRef);
    if (!taskSnap.exists()) throw new Error('Task not found.');

    const data = taskSnap.data();
    if (data.status !== 'pending_approval') {
      throw new Error('Task is not currently pending approval.');
    }

    const kidUid   = data.assignedToUid as string;
    let   finalXp  = data.xp; // safe fallback

    if (kidUid) {
      const kidRef  = doc(db, 'Users', kidUid);
      const kidSnap = await transaction.get(kidRef);

      if (kidSnap.exists()) {
        const kidData      = kidSnap.data();
        const currentStreak = kidData.currentStreak || 0;
        const difficulty    = (data.difficulty as TaskDifficulty) || 'easy';
        const bonusXp       = data.bonusXp || 0;

        // ── Reward Engine Formula ──────────────────────────────────
        finalXp = calculateFinalXp(data.xp, difficulty, currentStreak) + bonusXp;

        const newStreak = currentStreak + 1;
        transaction.update(kidRef, {
          totalXp       : increment(finalXp),
          tasksCompleted: increment(1),
          currentStreak : newStreak,
          bestStreak    : Math.max(kidData.bestStreak || 0, newStreak),
        });
      } else {
        console.warn(`[approveTask] Kid UID ${kidUid} not found — XP not awarded.`);
      }
    }

    transaction.update(taskRef, {
      status    : 'completed' as TaskStatus,
      finalXp,
      approvedAt: serverTimestamp(),
    });

    notifyKidTaskApproved(data.title, finalXp).catch((e) =>
      console.warn('[Notification] Failed to notify kid:', e),
    );
  });
}

/**
 * Parent rejects a task — resets kid's streak, sends task back to pending.
 */
export async function rejectTask(taskId: string): Promise<void> {
  if (!taskId) throw new Error('Task ID is required.');

  await runTransaction(db, async (transaction) => {
    const taskRef  = doc(db, 'Tasks', taskId);
    const taskSnap = await transaction.get(taskRef);
    if (!taskSnap.exists()) throw new Error('Task not found.');

    const data = taskSnap.data();
    if (data.status !== 'pending_approval') throw new Error('Task is not pending approval.');

    transaction.update(taskRef, {
      status     : 'pending' as TaskStatus,
      proofUrl   : null,
      bonusXp    : 0,
      completedAt: null,
    });

    // Reset streak on rejection
    const kidUid = data.assignedToUid as string;
    if (kidUid) {
      const kidRef  = doc(db, 'Users', kidUid);
      const kidSnap = await transaction.get(kidRef);
      if (kidSnap.exists()) {
        transaction.update(kidRef, { currentStreak: 0 });
      }
    }

    notifyKidTaskRejected(data.title).catch((e) =>
      console.warn('[Notification] Failed to notify kid on reject:', e),
    );
  });
}

// ─── User / XP Functions ─────────────────────────────────────────────

export async function getKidPoints(kidUid: string): Promise<number> {
  if (!kidUid) return 0;
  try {
    const snap = await getDoc(doc(db, 'Users', kidUid));
    return snap.exists() ? (snap.data().totalXp || 0) : 0;
  } catch (error) {
    console.warn('[getKidPoints] Failed:', error);
    return 0;
  }
}

/**
 * Claims a reward by atomically deducting XP.
 * Returns true on success, false if insufficient balance.
 */
export async function claimReward(kidUid: string, cost: number): Promise<boolean> {
  if (!kidUid) throw new Error('Invalid user ID.');
  if (cost < 0)  throw new Error('Reward cost cannot be negative.');
  try {
    await runTransaction(db, async (transaction) => {
      const userRef  = doc(db, 'Users', kidUid);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error('User not found.');
      const currentXp = userSnap.data().totalXp || 0;
      if (currentXp < cost) throw new Error('INSUFFICIENT_XP');
      transaction.update(userRef, {
        totalXp       : currentXp - cost,
        rewardsClaimed: increment(1),
      });
    });
    return true;
  } catch (error: any) {
    if (error.message === 'INSUFFICIENT_XP') return false;
    throw error;
  }
}

export async function getCurrentUserName(fallback = 'User'): Promise<string> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return fallback;
    const snap = await getDoc(doc(db, 'Users', uid));
    return snap.exists() ? (snap.data().name || fallback) : fallback;
  } catch {
    return fallback;
  }
}
