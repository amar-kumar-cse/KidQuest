/**
 * KidQuest — Shared Constants
 * Central source of truth for hardcoded values used across the app.
 */

// ─── XP & Leveling ───────────────────────────────────────────────
export const XP_PER_LEVEL   = 500;   // XP needed to advance one level
export const MAX_LEVEL       = 20;    // Level cap
export const FOCUS_BONUS_MULTIPLIER = 1.2; // 20% bonus XP during Focus Mode

// ─── Reward Engine Formula ───────────────────────────────────────
export type TaskDifficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTY_MULTIPLIERS: Record<TaskDifficulty, number> = {
  easy  : 1.0,
  medium: 1.5,
  hard  : 2.0,
};

export const STREAK_BONUS_PER_DAY = 10;   // +10 XP per streak day
export const MAX_STREAK_BONUS     = 100;  // Capped at 100 XP

/**
 * Calculates the final XP a kid earns for completing a task.
 * Formula: finalXp = Math.round(baseXp × difficulty) + streakBonus
 * streakBonus = min(currentStreak × STREAK_BONUS_PER_DAY, MAX_STREAK_BONUS)
 */
export function calculateFinalXp(
  baseXp    : number,
  difficulty: TaskDifficulty,
  streak    : number,
): number {
  const multiplier  = DIFFICULTY_MULTIPLIERS[difficulty] ?? 1.0;
  const streakBonus = Math.min(streak * STREAK_BONUS_PER_DAY, MAX_STREAK_BONUS);
  return Math.round(baseXp * multiplier) + streakBonus;
}

export const DIFFICULTY_LABELS: Record<TaskDifficulty, string> = {
  easy  : 'Easy   🟢',
  medium: 'Medium 🟡',
  hard  : 'Hard   🔴',
};

// Ordered list of level titles (index = level - 1)
export const LEVEL_TITLES: string[] = [
  'Novice', 'Apprentice', 'Explorer', 'Adventurer', 'Champion',
  'Hero', 'Legend', 'Master', 'Elite', 'Grandmaster',
  'Mythic I', 'Mythic II', 'Mythic III', 'Mythic IV', 'Mythic V',
  'Immortal', 'Celestial', 'Divine', 'Transcendent', 'Godlike',
];

export function getLevel(xp: number): number {
  return Math.min(Math.floor(xp / XP_PER_LEVEL) + 1, MAX_LEVEL);
}

export function getLevelTitle(xp: number): string {
  const level = getLevel(xp);
  return LEVEL_TITLES[level - 1] ?? 'Grandmaster';
}

export function getXpForNextLevel(xp: number): number {
  const level = getLevel(xp);
  return level >= MAX_LEVEL ? 0 : level * XP_PER_LEVEL - xp;
}

export function getLevelProgress(xp: number): number {
  const level = getLevel(xp);
  if (level >= MAX_LEVEL) return 1;
  const xpInCurrentLevel = xp % XP_PER_LEVEL;
  return xpInCurrentLevel / XP_PER_LEVEL;
}

// ─── Task Categories ─────────────────────────────────────────────
export const TASK_CATEGORY_ICONS: Record<string, string> = {
  homework : '📚',
  chores   : '🧹',
  reading  : '📖',
  exercise : '🏃',
  creative : '🎨',
  sports   : '⚽',
  other    : '📝',
};

export const TASK_CATEGORIES = Object.keys(TASK_CATEGORY_ICONS) as Array<
  keyof typeof TASK_CATEGORY_ICONS
>;

// ─── Validation ──────────────────────────────────────────────────
export const EMAIL_REGEX    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 6;
export const MIN_NAME_LENGTH     = 2;
export const MIN_XP              = 1;
export const MAX_XP              = 9999;

// ─── Firestore Collections ───────────────────────────────────────
export const COLLECTIONS = {
  users   : 'Users',
  tasks   : 'Tasks',
  rewards : 'Rewards',
} as const;

// ─── Focus Mode ──────────────────────────────────────────────────
export const FOCUS_DURATIONS_MINUTES = [15, 30, 45, 60, 90, 120];
export const FOCUS_STORAGE_KEY = '@kidquest_focus_session';

// ─── Schema Defaults ─────────────────────────────────────────────
/** Default structure for a new User document in Firestore */
export function defaultUserSchema(uid: string, name: string, email: string, role: 'parent' | 'kid') {
  return {
    uid,
    name,
    email,
    role,
    totalXp        : 0,
    tasksCompleted : 0,
    rewardsClaimed : 0,
    currentStreak  : 0,
    bestStreak     : 0,
    linkedKids     : [],   // used only for parent role
    linkedParent   : null, // used only for kid role
    notificationToken: null,
    dailyReminderEnabled: false,
    pushEnabled    : false,
  };
}
