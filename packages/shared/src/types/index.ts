// ==============================================================================
// KidQuest Shared Types
// ==============================================================================

export type UserRole = 'parent' | 'kid' | 'teacher' | 'admin';

export interface BaseUser {
  uid: string;
  email: string;
  name: string;
  avatarUrl?: string;
  avatarEmoji?: string;
  role: UserRole;
  fcmToken?: string;
  createdAt: Date | any;
  updatedAt: Date | any;
}

export interface Parent extends BaseUser {
  role: 'parent';
  linkedKids: string[];
  familyCode?: string;
}

export interface Kid extends BaseUser {
  role: 'kid';
  linkedParentId: string | null;
  age?: number;
  totalXp: number;
  currentStreak: number;
  bestStreak: number;
  lastActivityDate?: string; // 'YYYY-MM-DD'
  tasksCompleted: number;
  rewardsClaimed: number;
  level: number;
  hp: number;
}

export interface Teacher extends BaseUser {
  role: 'teacher';
  schoolId?: string;
  classes?: string[];
  studentCount?: number;
}

export type AppUser = Parent | Kid | Teacher;

export type TaskStatus = 'pending' | 'pending_approval' | 'completed' | 'rejected';
export type TaskDifficulty = 'easy' | 'medium' | 'hard';
export type TaskCategory =
  | 'homework'
  | 'chores'
  | 'reading'
  | 'exercise'
  | 'creative'
  | 'kindness'
  | 'other';

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  difficulty: TaskDifficulty;
  xp: number;
  bonusXp?: number;
  finalXp?: number;
  status: TaskStatus;
  parentId: string;
  assignedToUid: string;
  assignedToName: string;
  proofUrl?: string;
  proofNote?: string;
  parentNote?: string;
  dueDate: any;
  completedAt?: any;
  approvedAt?: any;
  createdAt: any;
  updatedAt: any;
  assignedTo?: string; // Legacy compat
}

export interface CreateTaskInput {
  title: string;
  description: string;
  category: TaskCategory;
  difficulty: TaskDifficulty;
  xp: number;
  assignedToUid: string;
  assignedToName: string;
  dueDate: Date;
}

export interface Reward {
  id: string;
  parentId: string;
  title: string;
  description?: string;
  costXp: number;
  iconEmoji: string;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface CreateRewardInput {
  title: string;
  description?: string;
  costXp: number;
  iconEmoji: string;
}

export interface RewardClaim {
  id: string;
  rewardId: string;
  rewardTitle: string;
  costXp: number;
  kidId: string;
  kidName: string;
  parentId: string;
  status: 'pending' | 'approved' | 'rejected';
  claimedAt: any;
  resolvedAt?: any;
}
