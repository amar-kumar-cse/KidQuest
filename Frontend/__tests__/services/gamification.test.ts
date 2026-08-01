/**
 * Unit tests for Gamification logic: XP multipliers, Level progression, Streak calculation, and Reward claiming.
 */

// Helper functions matching KidQuest gamification rules
export function calculateXp(baseXp: number, difficulty: 'easy' | 'medium' | 'hard'): number {
  const multipliers: Record<'easy' | 'medium' | 'hard', number> = {
    easy: 1.0,
    medium: 1.5,
    hard: 2.0,
  };
  return Math.round(baseXp * (multipliers[difficulty] || 1.0));
}

export function calculateLevel(totalXp: number): number {
  if (totalXp < 0) return 1;
  return Math.floor(totalXp / 500) + 1;
}

export function calculateStreak(lastCompletedDateStr: string | null, currentStreak: number): number {
  if (!lastCompletedDateStr) return 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastDate = new Date(lastCompletedDateStr);
  lastDate.setHours(0, 0, 0, 0);

  const diffInDays = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

  if (diffInDays === 0) return currentStreak; // Completed another task on same day
  if (diffInDays === 1) return currentStreak + 1; // Consecutive day
  return 1; // Streak reset
}

export function canClaimReward(kidXp: number, rewardCost: number): boolean {
  return kidXp >= rewardCost && rewardCost > 0;
}

describe('Gamification Core Logic', () => {
  describe('XP Calculation', () => {
    it('should correctly calculate XP for easy difficulty', () => {
      expect(calculateXp(100, 'easy')).toBe(100);
    });

    it('should correctly calculate XP for medium difficulty (1.5x)', () => {
      expect(calculateXp(100, 'medium')).toBe(150);
    });

    it('should correctly calculate XP for hard difficulty (2x)', () => {
      expect(calculateXp(100, 'hard')).toBe(200);
    });
  });

  describe('Level Progression', () => {
    it('should start at Level 1 for 0 XP', () => {
      expect(calculateLevel(0)).toBe(1);
    });

    it('should reach Level 2 at 500 XP', () => {
      expect(calculateLevel(500)).toBe(2);
    });

    it('should reach Level 3 at 1000 XP', () => {
      expect(calculateLevel(1000)).toBe(3);
    });

    it('should correctly calculate higher levels', () => {
      expect(calculateLevel(2450)).toBe(5);
    });
  });

  describe('Streak Logic', () => {
    it('should start streak at 1 for first task completion', () => {
      expect(calculateStreak(null, 0)).toBe(1);
    });

    it('should maintain streak if task completed on same day', () => {
      const todayStr = new Date().toISOString();
      expect(calculateStreak(todayStr, 5)).toBe(5);
    });

    it('should increment streak if completed on consecutive day', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(calculateStreak(yesterday.toISOString(), 5)).toBe(6);
    });

    it('should reset streak to 1 if missed a day', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      expect(calculateStreak(threeDaysAgo.toISOString(), 5)).toBe(1);
    });
  });

  describe('Reward Claiming', () => {
    it('should allow claiming reward when kid has sufficient XP', () => {
      expect(canClaimReward(500, 300)).toBe(true);
    });

    it('should disallow claiming reward when kid has insufficient XP', () => {
      expect(canClaimReward(200, 300)).toBe(false);
    });

    it('should disallow claiming zero-cost or invalid reward', () => {
      expect(canClaimReward(500, 0)).toBe(false);
    });
  });
});
