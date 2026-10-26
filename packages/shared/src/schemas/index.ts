// ==============================================================================
// KidQuest Shared Zod Validation Schemas
// Client & Cloud Functions unified input verification
// ==============================================================================

import { z } from 'zod';

// --- User & Role Schemas ---
export const UserRoleSchema = z.enum(['parent', 'kid', 'teacher', 'admin']);

export const RegisterParentSchema = z.object({
  email: z.string().email('Invalid email address').max(100),
  name: z.string().min(2, 'Name must be at least 2 characters').max(60),
});

export const CreateChildProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  age: z.number().int().min(3).max(17).optional(),
  avatarEmoji: z.string().min(1).max(10).default('🦸'),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits').optional(),
});

// --- Task Schemas ---
export const TaskDifficultySchema = z.enum(['easy', 'medium', 'hard']);

export const TaskCategorySchema = z.enum([
  'homework',
  'chores',
  'reading',
  'exercise',
  'creative',
  'kindness',
  'other',
]);

export const TaskStatusSchema = z.enum([
  'pending',
  'pending_approval',
  'completed',
  'rejected',
]);

export const CreateTaskSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(120),
  description: z.string().max(500).default(''),
  category: TaskCategorySchema,
  difficulty: TaskDifficultySchema,
  xp: z.number().int().min(5).max(1000),
  assignedToUid: z.string().min(1, 'Target child UID is required'),
  assignedToName: z.string().min(1, 'Target child name is required'),
  dueDate: z.date().or(z.string()),
});

export const SubmitTaskProofSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  proofUrl: z.string().url('Proof must be a valid URL'),
  note: z.string().max(300).optional(),
});

export const ReviewTaskSubmissionSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  childUid: z.string().min(1, 'Child UID is required'),
  decision: z.enum(['approve', 'reject']),
  parentNote: z.string().max(300).optional(),
});

// --- Reward Schemas ---
export const CreateRewardSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(80),
  description: z.string().max(300).optional(),
  costXp: z.number().int().min(10).max(10000),
  iconEmoji: z.string().min(1).max(10).default('🎁'),
});

export const ClaimRewardSchema = z.object({
  rewardId: z.string().min(1, 'Reward ID is required'),
  childUid: z.string().min(1, 'Child UID is required'),
});
