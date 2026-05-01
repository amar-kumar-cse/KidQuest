// ─── Task Categories ──────────────────────────────────────────────────────────

export interface TaskCategoryDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
}

export const TASK_CATEGORIES: TaskCategoryDef[] = [
  { id: 'homework',  label: 'Homework',  icon: '📚', color: '#3B82F6', bg: '#EFF6FF' },
  { id: 'chores',    label: 'Chores',    icon: '🧹', color: '#10B981', bg: '#ECFDF5' },
  { id: 'reading',   label: 'Reading',   icon: '📖', color: '#8B5CF6', bg: '#F5F3FF' },
  { id: 'exercise',  label: 'Exercise',  icon: '🏃', color: '#F59E0B', bg: '#FFFBEB' },
  { id: 'creative',  label: 'Creative',  icon: '🎨', color: '#EC4899', bg: '#FDF2F8' },
  { id: 'kindness',  label: 'Kindness',  icon: '💝', color: '#EF4444', bg: '#FEF2F2' },
  { id: 'other',     label: 'Other',     icon: '📝', color: '#6B7280', bg: '#F9FAFB' },
];

export const getCategoryDef = (id: string): TaskCategoryDef =>
  TASK_CATEGORIES.find((c) => c.id === id) ?? TASK_CATEGORIES[TASK_CATEGORIES.length - 1];
