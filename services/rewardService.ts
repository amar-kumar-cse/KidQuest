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
  getDocs,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import type { Reward, CreateRewardInput } from '../types';

// ─── Reward Service ───────────────────────────────────────────────────────────

export const rewardService = {
  /**
   * Create a new reward for a parent.
   */
  async createReward(parentId: string, input: CreateRewardInput): Promise<string> {
    const docRef = await addDoc(collection(db, 'Rewards'), {
      title: input.title,
      description: input.description ?? null,
      xpCost: input.xpCost,
      iconEmoji: input.iconEmoji,
      parentId,
      isActive: true,
      claimedCount: 0,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  /**
   * Real-time subscription to rewards for a specific parent.
   */
  subscribeToParentRewards(
    parentId: string,
    callback: (rewards: Reward[]) => void,
  ): () => void {
    const q = query(collection(db, 'Rewards'), where('parentId', '==', parentId));
    return onSnapshot(q, (snap) => {
      const rewards = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reward));
      callback(rewards);
    });
  },

  /**
   * Real-time subscription to rewards available for a kid (by their parent's ID).
   */
  subscribeToKidRewards(
    linkedParentId: string,
    callback: (rewards: Reward[]) => void,
  ): () => void {
    const q = query(
      collection(db, 'Rewards'),
      where('parentId', '==', linkedParentId),
      where('isActive', '==', true),
    );
    return onSnapshot(q, (snap) => {
      const rewards = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reward));
      rewards.sort((a, b) => a.xpCost - b.xpCost); // Sort by cost ascending
      callback(rewards);
    });
  },

  /**
   * Claim a reward via Cloud Function (handles XP deduction in a transaction).
   */
  async claimReward(rewardId: string): Promise<void> {
    const fn = httpsCallable(functions, 'claimReward');
    await fn({ rewardId });
  },

  /**
   * Update a reward (parent only).
   */
  async updateReward(rewardId: string, updates: Partial<Reward>): Promise<void> {
    await updateDoc(doc(db, 'Rewards', rewardId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Toggle a reward's active status (enable/disable).
   */
  async toggleReward(rewardId: string, isActive: boolean): Promise<void> {
    await updateDoc(doc(db, 'Rewards', rewardId), { isActive });
  },

  /**
   * Delete a reward (parent only).
   */
  async deleteReward(rewardId: string): Promise<void> {
    await deleteDoc(doc(db, 'Rewards', rewardId));
  },

  /**
   * Fetch all rewards for a parent (one-shot).
   */
  async getParentRewards(parentId: string): Promise<Reward[]> {
    const q = query(collection(db, 'Rewards'), where('parentId', '==', parentId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reward));
  },
};
