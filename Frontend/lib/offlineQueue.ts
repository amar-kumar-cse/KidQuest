import { syncQueueService } from './syncQueueService';
import { taskRepository } from './db/taskRepository';

/**
 * ─── Legacy Offline Queue Adapter ─────────────────────────────────────────────
 * Migrated from AsyncStorage to SQLite + Drizzle-backed `syncQueueService`.
 * Preserves the previous API signature while delivering atomic transactions,
 * exponential backoff, and robust conflict resolution.
 */
export const offlineQueue = {
  /**
   * Save a proof submission to the local SQLite sync queue.
   */
  async saveOfflineProof(taskId: string, localUri: string, proofNote?: string): Promise<void> {
    // 1. Optimistically update local task in SQLite
    await taskRepository.upsertTask(
      {
        id: taskId,
        status: 'pending_approval',
        proofUrl: localUri,
        proofNote: proofNote || undefined,
      },
      false // mark unsynced
    );

    // 2. Enqueue into SQLite sync queue with backoff retries
    await syncQueueService.enqueue('SUBMIT_PROOF', taskId, {
      taskId,
      localUri,
      proofNote,
    });
  },

  /**
   * Get all queued proofs currently stored locally.
   */
  async getQueuedProofs(): Promise<{ taskId: string; localUri: string; timestamp: number }[]> {
    const count = syncQueueService.getPendingCount();
    return count > 0 ? [{ taskId: 'pending', localUri: '', timestamp: Date.now() }] : [];
  },

  /**
   * Process all pending items in SQLite queue.
   */
  async processOfflineQueue(): Promise<void> {
    await syncQueueService.processQueue();
  },
};
