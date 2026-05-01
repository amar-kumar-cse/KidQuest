import { useEffect } from 'react';
import { taskService } from '../services/taskService';
import { useTaskStore } from '../store/useTaskStore';
import type { Task } from '../types';

// ─── useTasks Hook (new typed version) ────────────────────────────────────────

/**
 * Subscribe to real-time tasks for a parent, storing results in Zustand.
 */
export function useParentTasks(parentId: string | null | undefined) {
  const { setTasks, setLoading, tasks, isLoading } = useTaskStore();

  useEffect(() => {
    if (!parentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = taskService.subscribeToParentTasks(parentId, (tasks) => {
      setTasks(tasks);
      setLoading(false);
    });
    return unsubscribe;
  }, [parentId]);

  return { tasks, isLoading };
}

/**
 * Subscribe to real-time tasks for a kid, storing results in Zustand.
 */
export function useKidTasks(kidId: string | null | undefined) {
  const { setTasks, setLoading, tasks, isLoading } = useTaskStore();

  useEffect(() => {
    if (!kidId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = taskService.subscribeToKidTasks(kidId, (tasks) => {
      setTasks(tasks);
      setLoading(false);
    });
    return unsubscribe;
  }, [kidId]);

  return {
    tasks,
    isLoading,
    pendingTasks: tasks.filter((t) => t.status === 'pending'),
    submittedTasks: tasks.filter((t) => t.status === 'pending_approval'),
    completedTasks: tasks.filter((t) => t.status === 'completed'),
  };
}
