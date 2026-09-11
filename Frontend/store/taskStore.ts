import { create } from 'zustand';
import type { Task } from '../types';

export interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  setTasks: (tasks: Task[]) => void;
  setLoading: (loading: boolean) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  completeTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  // Derived selectors
  getPendingApprovals: () => Task[];
  getPendingTasks: () => Task[];
  getCompletedTasks: () => Task[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,

  setTasks: (tasks) => set({ tasks }),

  setLoading: (isLoading) => set({ isLoading }),

  addTask: (task) =>
    set((state) => ({
      tasks: [task, ...state.tasks],
    })),

  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      ),
    })),

  completeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? { ...task, status: 'completed', completedAt: new Date() }
          : task
      ),
    })),

  deleteTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== taskId),
    })),

  getPendingApprovals: () =>
    get().tasks.filter((t) => t.status === 'pending_approval'),

  getPendingTasks: () =>
    get().tasks.filter((t) => t.status === 'pending'),

  getCompletedTasks: () =>
    get().tasks.filter((t) => t.status === 'completed'),
}));

// Named export compatibility for taskStore
export const taskStore = useTaskStore;
export default useTaskStore;
