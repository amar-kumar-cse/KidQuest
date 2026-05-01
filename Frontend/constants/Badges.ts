// ─── Achievement Badges ───────────────────────────────────────────────────────

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  /** Condition: e.g. tasksCompleted >= 1 */
  check: (stats: BadgeStats) => boolean;
}

export interface BadgeStats {
  tasksCompleted: number;
  currentStreak: number;
  bestStreak: number;
  totalXp: number;
  level: number;
  rewardsClaimed: number;
}

export const BADGES: BadgeDef[] = [
  {
    id: 'first_quest',
    name: 'First Quest',
    description: 'Complete your very first task!',
    icon: '⭐',
    color: '#FFB800',
    check: ({ tasksCompleted }) => tasksCompleted >= 1,
  },
  {
    id: 'on_fire',
    name: 'On Fire!',
    description: 'Maintain a 3-day streak.',
    icon: '🔥',
    color: '#FF6B35',
    check: ({ currentStreak }) => currentStreak >= 3,
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Complete tasks 7 days in a row.',
    icon: '🗡️',
    color: '#6C63FF',
    check: ({ bestStreak }) => bestStreak >= 7,
  },
  {
    id: 'xp_collector',
    name: 'XP Collector',
    description: 'Earn 500 total XP.',
    icon: '💎',
    color: '#48BEFF',
    check: ({ totalXp }) => totalXp >= 500,
  },
  {
    id: 'task_master',
    name: 'Task Master',
    description: 'Complete 10 tasks.',
    icon: '🏆',
    color: '#FFD60A',
    check: ({ tasksCompleted }) => tasksCompleted >= 10,
  },
  {
    id: 'reward_hunter',
    name: 'Reward Hunter',
    description: 'Claim your first reward.',
    icon: '🎁',
    color: '#EC4899',
    check: ({ rewardsClaimed }) => rewardsClaimed >= 1,
  },
  {
    id: 'level_up',
    name: 'Level Up!',
    description: 'Reach Level 3.',
    icon: '🚀',
    color: '#8B5CF6',
    check: ({ level }) => level >= 3,
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Maintain a 14-day streak.',
    icon: '⚡',
    color: '#F59E0B',
    check: ({ bestStreak }) => bestStreak >= 14,
  },
  {
    id: 'legend',
    name: 'Legend',
    description: 'Earn 2000 total XP.',
    icon: '👑',
    color: '#FF6B9D',
    check: ({ totalXp }) => totalXp >= 2000,
  },
];

export function getEarnedBadges(stats: BadgeStats): BadgeDef[] {
  return BADGES.filter((badge) => badge.check(stats));
}
