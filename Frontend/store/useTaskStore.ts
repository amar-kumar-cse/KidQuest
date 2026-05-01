import { create } from 'zustand';
import type { Task } from '../types';

// ─── Task Store ────────────────────────────────────────────────────────────────

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  setTasks: (tasks: Task[]) => void;
  setLoading: (loading: boolean) => void;
  // Derived selectors
  getPendingApprovals: () => Task[];
  getPendingTasks: () => Task[];
  getCompletedTasks: () => Task[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: true,
  setTasks: (tasks) => set({ tasks }),
  setLoading: (isLoading) => set({ isLoading }),
  getPendingApprovals: () => get().tasks.filter((t) => t.status === 'pending_approval'),
  getPendingTasks: () => get().tasks.filter((t) => t.status === 'pending'),
  getCompletedTasks: () => get().tasks.filter((t) => t.status === 'completed'),
}));
