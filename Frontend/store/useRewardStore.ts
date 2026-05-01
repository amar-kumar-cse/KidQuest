import { create } from 'zustand';
import type { Reward } from '../types';

// ─── Reward Store ──────────────────────────────────────────────────────────────

interface RewardState {
  rewards: Reward[];
  isLoading: boolean;
  setRewards: (rewards: Reward[]) => void;
  setLoading: (loading: boolean) => void;
  getActiveRewards: () => Reward[];
}

export const useRewardStore = create<RewardState>((set, get) => ({
  rewards: [],
  isLoading: true,
  setRewards: (rewards) => set({ rewards }),
  setLoading: (isLoading) => set({ isLoading }),
  getActiveRewards: () => get().rewards.filter((r) => r.isActive),
}));
