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
  xp: number;                   // Base XP
  bonusXp?: number;             // Bonus XP added on approval
  finalXp?: number;             // Actual XP awarded after approval
  status: TaskStatus;
  parentId: string;
  assignedToUid: string;
  assignedToName: string;
  proofUrl?: string;
  proofNote?: string;
  parentNote?: string;          // Rejection reason or praise
  dueDate: any;                 // Firestore Timestamp or Date
  completedAt?: any;
  approvedAt?: any;
  createdAt: any;
  updatedAt: any;
  // Legacy compat fields
  assignedTo?: string;          // Alias for assignedToName
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
