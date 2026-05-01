export interface Reward {
  id: string;
  title: string;
  description?: string;
  xpCost: number;
  iconEmoji: string;         // e.g. "🎮", "🍕", "🎬"
  parentId: string;
  isActive: boolean;
  claimedCount: number;
  createdAt: any;            // Firestore Timestamp
}

export interface CreateRewardInput {
  title: string;
  description?: string;
  xpCost: number;
  iconEmoji: string;
}

export interface RewardClaim {
  id: string;
  rewardId: string;
  rewardTitle: string;
  kidId: string;
  parentId: string;
  xpSpent: number;
  status: 'pending_delivery' | 'delivered';
  claimedAt: any;           // Firestore Timestamp
}
