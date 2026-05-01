export type UserRole = 'parent' | 'kid';

export interface BaseUser {
  uid: string;
  email: string;
  name: string;
  avatarUrl?: string;
  avatarEmoji?: string;
  role: UserRole;
  fcmToken?: string;        // Push notification token
  createdAt: Date;
  updatedAt: Date;
}

export interface Parent extends BaseUser {
  role: 'parent';
  linkedKids: string[];     // Array of kid UIDs
  familyCode?: string;      // Current active family code
}

export interface Kid extends BaseUser {
  role: 'kid';
  linkedParentId: string | null;
  age?: number;
  totalXp: number;
  currentStreak: number;
  bestStreak: number;
  lastActivityDate?: string; // 'YYYY-MM-DD' for streak calculation
  tasksCompleted: number;
  rewardsClaimed: number;
  level: number;            // Calculated from totalXp
}

export type AppUser = Parent | Kid;
