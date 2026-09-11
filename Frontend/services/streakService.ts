import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface StreakData {
  userId: string;
  currentStreak: number;
  bestStreak: number;
  lastCompletedAt: Date | null;
  updatedAt: Date;
}

export interface StreakCalculationResult {
  newStreak: number;
  bestStreak: number;
  isReset: boolean;
  isSameDay: boolean;
}

/**
 * Pure calculation logic for streaks (timezone-safe comparison on UTC/local calendar day).
 */
export function calculateStreak(
  lastCompletedAt: Date | null,
  currentStreak: number,
  bestStreak: number,
  completedDate: Date = new Date()
): StreakCalculationResult {
  if (!lastCompletedAt) {
    const newStreak = 1;
    return {
      newStreak,
      bestStreak: Math.max(bestStreak, newStreak),
      isReset: false,
      isSameDay: false,
    };
  }

  // Normalize dates to UTC midnight for reliable calendar day difference
  const startOfDayUTC = (d: Date) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

  const dayDiff = Math.floor(
    (startOfDayUTC(completedDate) - startOfDayUTC(lastCompletedAt)) / (1000 * 60 * 60 * 24)
  );

  // Same day completion -> streak does not increment again
  if (dayDiff === 0) {
    return {
      newStreak: currentStreak,
      bestStreak,
      isReset: false,
      isSameDay: true,
    };
  }

  // Consecutive day -> increment streak
  if (dayDiff === 1) {
    const newStreak = currentStreak + 1;
    return {
      newStreak,
      bestStreak: Math.max(bestStreak, newStreak),
      isReset: false,
      isSameDay: false,
    };
  }

  // Missed one or more days -> streak resets to 1
  const newStreak = 1;
  return {
    newStreak,
    bestStreak,
    isReset: true,
    isSameDay: false,
  };
}

export const streakService = {
  /**
   * Fetch current streak document for a user.
   */
  async getStreak(userId: string): Promise<StreakData> {
    const ref = doc(db, 'streaks', userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return {
        userId,
        currentStreak: 0,
        bestStreak: 0,
        lastCompletedAt: null,
        updatedAt: new Date(),
      };
    }

    const data = snap.data();
    return {
      userId,
      currentStreak: data.currentStreak ?? 0,
      bestStreak: data.bestStreak ?? 0,
      lastCompletedAt: data.lastCompletedAt ? (data.lastCompletedAt.toDate?.() ?? new Date(data.lastCompletedAt)) : null,
      updatedAt: data.updatedAt ? (data.updatedAt.toDate?.() ?? new Date(data.updatedAt)) : new Date(),
    };
  },

  /**
   * Update streak on task completion.
   */
  async updateStreak(userId: string, completedDate: Date = new Date()): Promise<StreakCalculationResult> {
    const current = await this.getStreak(userId);
    const result = calculateStreak(
      current.lastCompletedAt,
      current.currentStreak,
      current.bestStreak,
      completedDate
    );

    const ref = doc(db, 'streaks', userId);
    await setDoc(
      ref,
      {
        userId,
        currentStreak: result.newStreak,
        bestStreak: result.bestStreak,
        lastCompletedAt: Timestamp.fromDate(completedDate),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return result;
  },

  /**
   * Explicitly reset a user's streak to 0.
   */
  async resetStreak(userId: string): Promise<void> {
    const current = await this.getStreak(userId);
    const ref = doc(db, 'streaks', userId);
    await setDoc(
      ref,
      {
        userId,
        currentStreak: 0,
        bestStreak: current.bestStreak,
        lastCompletedAt: null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  },
};
