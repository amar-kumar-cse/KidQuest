import { useEffect } from 'react';
import { rewardService } from '../services/rewardService';
import { useRewardStore } from '../store/useRewardStore';
import type { Reward } from '../types';

// ─── useRewards Hook ───────────────────────────────────────────────────────────

/**
 * Subscribe to real-time rewards for a parent.
 */
export function useParentRewards(parentId: string | null | undefined) {
  const { setRewards, setLoading, rewards, isLoading } = useRewardStore();

  useEffect(() => {
    if (!parentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = rewardService.subscribeToParentRewards(parentId, (rewards) => {
      setRewards(rewards);
      setLoading(false);
    });
    return unsubscribe;
  }, [parentId]);

  return { rewards, isLoading };
}

/**
 * Subscribe to real-time rewards available for a kid (by their parent ID).
 */
export function useKidRewards(linkedParentId: string | null | undefined) {
  const { setRewards, setLoading, rewards, isLoading } = useRewardStore();

  useEffect(() => {
    if (!linkedParentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = rewardService.subscribeToKidRewards(linkedParentId, (rewards) => {
      setRewards(rewards);
      setLoading(false);
    });
    return unsubscribe;
  }, [linkedParentId]);

  return { rewards, isLoading };
}
