import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskRepository } from '../lib/db/taskRepository';
import { taskService } from '../services/taskService';
import { syncQueueService } from '../lib/syncQueueService';
import type { Task, CreateTaskInput } from '../types';

export const TASKS_QUERY_KEY = 'tasks';

/**
 * ─── useTasksQuery Hook ───────────────────────────────────────────────────────
 * Offline-first TanStack Query hook:
 * 1. Instantly returns tasks from SQLite cache.
 * 2. Establishes Firestore real-time listener to keep SQLite and React Query cache synchronized.
 */
export function useTasksQuery(userId: string | undefined, role: 'parent' | 'kid' | null) {
  const queryClient = useQueryClient();

  const queryKey = [TASKS_QUERY_KEY, role, userId];

  const query = useQuery({
    queryKey,
    enabled: Boolean(userId && role),
    queryFn: async (): Promise<Task[]> => {
      if (!userId || !role) return [];

      // 1. Fetch from local SQLite DB first
      const localTasks = await taskRepository.getTasksForUser(userId, role);
      return localTasks;
    },
  });

  // 2. Real-time background sync subscription
  useEffect(() => {
    if (!userId || !role) return;

    let unsubscribe: (() => void) | undefined;

    if (role === 'kid') {
      unsubscribe = taskService.subscribeToKidTasks(userId, async (remoteTasks) => {
        // Upsert into local SQLite cache
        await taskRepository.upsertBatch(remoteTasks);
        // Refresh TanStack Query cache
        queryClient.setQueryData(queryKey, remoteTasks);
      });
    } else {
      unsubscribe = taskService.subscribeToParentTasks(userId, async (remoteTasks) => {
        await taskRepository.upsertBatch(remoteTasks);
        queryClient.setQueryData(queryKey, remoteTasks);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId, role, queryClient]);

  return query;
}

/**
 * ─── Optimistic Submit Proof Mutation ─────────────────────────────────────────
 * Immediately marks the task as 'pending_approval' in UI, updates SQLite,
 * and enqueues to the offline sync queue with exponential backoff.
 */
export function useSubmitProofMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      localUri,
      proofNote,
    }: {
      taskId: string;
      localUri: string;
      proofNote?: string;
    }) => {
      // 1. Optimistic SQLite write (marked unsynced)
      await taskRepository.upsertTask(
        {
          id: taskId,
          status: 'pending_approval',
          proofUrl: localUri,
          proofNote: proofNote || undefined,
        },
        false
      );

      // 2. Enqueue into sync queue with backoff
      await syncQueueService.enqueue('SUBMIT_PROOF', taskId, {
        taskId,
        localUri,
        proofNote,
      });

      return { taskId, localUri, proofNote };
    },

    onMutate: async ({ taskId, localUri, proofNote }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: [TASKS_QUERY_KEY] });

      // Snapshot previous value across all tasks queries
      const previousTasks = queryClient.getQueriesData<Task[]>({ queryKey: [TASKS_QUERY_KEY] });

      // Optimistically update all matching queries
      queryClient.setQueriesData<Task[]>({ queryKey: [TASKS_QUERY_KEY] }, (old) => {
        if (!old) return [];
        return old.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: 'pending_approval' as const,
                proofUrl: localUri,
                proofNote: proofNote || undefined,
                completedAt: new Date(),
              }
            : t
        );
      });

      return { previousTasks };
    },

    onError: (_err, _variables, context) => {
      // Rollback on unexpected failure
      if (context?.previousTasks) {
        for (const [key, data] of context.previousTasks) {
          queryClient.setQueryData(key, data);
        }
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
    },
  });
}

/**
 * ─── Optimistic Create Task Mutation ──────────────────────────────────────────
 */
export function useCreateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      parentId,
      input,
    }: {
      parentId: string;
      input: CreateTaskInput;
    }) => {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      // 1. Save optimistically to SQLite
      await taskRepository.upsertTask(
        {
          id: tempId,
          parentId,
          assignedToUid: input.assignedToUid,
          assignedToName: input.assignedToName,
          title: input.title,
          description: input.description,
          category: input.category,
          difficulty: input.difficulty,
          xp: input.xp,
          status: 'pending',
          dueDate: input.dueDate,
        },
        false
      );

      // 2. Enqueue for background creation
      await syncQueueService.enqueue('CREATE_TASK', tempId, {
        parentId,
        input,
      });

      return tempId;
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
    },
  });
}
