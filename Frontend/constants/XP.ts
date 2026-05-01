// ─── XP System ────────────────────────────────────────────────────────────────

/**
 * XP thresholds to reach each level.
 * Index = level - 1, so LEVEL_THRESHOLDS[0] = XP needed for level 1 (always 0).
 */
export const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000];

/** Max level in the game */
export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

/**
 * Calculate the current level from total XP.
 */
export function calculateLevel(totalXp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

/**
 * Returns progress towards the next level.
 */
export function xpToNextLevel(totalXp: number): {
  current: number;
  required: number;
  level: number;
  progressPercent: number;
} {
  const level = calculateLevel(totalXp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const current = totalXp - currentThreshold;
  const required = nextThreshold - currentThreshold;
  const progressPercent = Math.min(100, Math.round((current / required) * 100));
  return { current, required, level, progressPercent };
}

/**
 * Default XP values per difficulty level.
 */
export const XP_BY_DIFFICULTY = {
  easy: 25,
  medium: 50,
  hard: 100,
} as const;

/**
 * Streak bonus multipliers.
 */
export const STREAK_BONUS = {
  3: 1.1,   // 3-day streak: +10% XP
  7: 1.25,  // 7-day streak: +25% XP
  14: 1.5,  // 14-day streak: +50% XP
  30: 2.0,  // 30-day streak: double XP
} as const;
