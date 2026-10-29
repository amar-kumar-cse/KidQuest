import NetInfo from '@react-native-community/netinfo';
import { getExpoDb } from './db';
import { taskRepository } from './db/taskRepository';
import { storageService } from '../services/storageService';
import { taskService } from '../services/taskService';

export type SyncActionType = 'CREATE_TASK' | 'SUBMIT_PROOF' | 'UPDATE_TASK' | 'DELETE_TASK';

export interface SyncQueueItemRecord {
  id: string;
  action_type: SyncActionType;
  entity_id: string;
  payload: string; // JSON
  retry_count: number;
  max_retries: number;
  status: 'pending' | 'processing' | 'failed';
  last_attempt_at: number | null;
  error_message: string | null;
  created_at: number;
}

type QueueListener = (pendingCount: number) => void;

class SyncQueueService {
  private isProcessing = false;
  private listeners: Set<QueueListener> = new Set();

  /**
   * Register a listener for pending queue changes.
   */
  subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    listener(this.getPendingCount());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const count = this.getPendingCount();
    for (const listener of this.listeners) {
      try {
        listener(count);
      } catch (err) {
        console.error('[syncQueue] Error in listener:', err);
      }
    }
  }

  /**
   * Get the number of pending items in the queue.
   */
  getPendingCount(): number {
    try {
      const sqlite = getExpoDb();
      const res = sqlite.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'`
      );
      return res?.count ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Enqueue a new mutation into the SQLite sync queue.
   */
  async enqueue(
    actionType: SyncActionType,
    entityId: string,
    payloadData: any,
    maxRetries = 5
  ): Promise<string> {
    const sqlite = getExpoDb();
    const id = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const payloadStr = JSON.stringify(payloadData);
    const now = Date.now();

    sqlite.runSync(
      `INSERT INTO sync_queue (
        id, action_type, entity_id, payload, retry_count, max_retries, status, created_at
      ) VALUES (?, ?, ?, ?, 0, ?, 'pending', ?)`,
      [id, actionType, entityId, payloadStr, maxRetries, now]
    );

    this.notifyListeners();
    console.log(`[syncQueue] Enqueued action ${actionType} for entity ${entityId}`);

    // Trigger immediate background sync attempt if online
    this.processQueue().catch(() => {});

    return id;
  }

  /**
   * Calculate exponential backoff with random jitter.
   * delay = min(1000 * 2^retryCount, 30000) + random_jitter(0..500ms)
   */
  calculateBackoff(retryCount: number): number {
    const base = Math.min(1000 * Math.pow(2, retryCount), 30000);
    const jitter = Math.floor(Math.random() * 500);
    return base + jitter;
  }

  /**
   * Process all pending items in the sync queue.
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    try {
      // 1. Check network connectivity
      const netState = await NetInfo.fetch();
      if (!netState.isConnected || netState.isInternetReachable === false) {
        console.log('[syncQueue] Network offline, skipping sync processing');
        return;
      }

      this.isProcessing = true;
      const sqlite = getExpoDb();
      const items = sqlite.getAllSync<SyncQueueItemRecord>(
        `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC`
      );

      if (items.length === 0) {
        this.isProcessing = false;
        return;
      }

      console.log(`[syncQueue] Processing ${items.length} pending mutation(s)...`);

      const now = Date.now();

      for (const item of items) {
        // Exponential backoff check
        if (item.last_attempt_at) {
          const delay = this.calculateBackoff(item.retry_count);
          if (now - item.last_attempt_at < delay) {
            console.log(`[syncQueue] Item ${item.id} waiting for backoff (${delay}ms)`);
            continue;
          }
        }

        // Mark processing
        sqlite.runSync(
          `UPDATE sync_queue SET status = 'processing', last_attempt_at = ? WHERE id = ?`,
          [now, item.id]
        );

        try {
          const payload = JSON.parse(item.payload);
          await this.executeAction(item.action_type, item.entity_id, payload);

          // Success: Remove from queue
          sqlite.runSync(`DELETE FROM sync_queue WHERE id = ?`, [item.id]);
          console.log(`[syncQueue] Successfully synced item ${item.id} (${item.action_type})`);
        } catch (error: any) {
          const newRetryCount = item.retry_count + 1;
          const isFinalFailure = newRetryCount >= item.max_retries;
          const status = isFinalFailure ? 'failed' : 'pending';
          const errMsg = error?.message || String(error);

          console.warn(`[syncQueue] Failed attempt ${newRetryCount}/${item.max_retries} for ${item.id}:`, errMsg);

          sqlite.runSync(
            `UPDATE sync_queue SET status = ?, retry_count = ?, error_message = ?, last_attempt_at = ? WHERE id = ?`,
            [status, newRetryCount, errMsg, Date.now(), item.id]
          );
        }
      }
    } catch (globalErr) {
      console.error('[syncQueue] Error during queue run:', globalErr);
    } finally {
      this.isProcessing = false;
      this.notifyListeners();
    }
  }

  /**
   * Dispatch and execute a single mutation action against Firebase.
   */
  private async executeAction(
    actionType: SyncActionType,
    entityId: string,
    payload: any
  ): Promise<void> {
    switch (actionType) {
      case 'SUBMIT_PROOF': {
        const { taskId, localUri, proofNote } = payload;
        let downloadUrl = localUri;

        // If proof is a local file URI, compress and upload to Firebase Storage
        if (localUri && (localUri.startsWith('file://') || localUri.startsWith('/') || localUri.startsWith('ph://'))) {
          downloadUrl = await storageService.uploadProofPhoto(localUri, taskId);
        }

        // Submit proof to Firestore (server authoritative timestamp & state)
        await taskService.submitProof(taskId, downloadUrl, proofNote);

        // Update local SQLite record to reflect synced status
        await taskRepository.upsertTask(
          {
            id: taskId,
            status: 'pending_approval',
            proofUrl: downloadUrl,
            proofNote,
          },
          true
        );
        break;
      }

      case 'CREATE_TASK': {
        const { parentId, input } = payload;
        const serverId = await taskService.createTask(parentId, input);

        // Reconcile: replace temp local id with real Firestore server id
        if (entityId !== serverId) {
          const sqlite = getExpoDb();
          sqlite.runSync(
            `UPDATE local_tasks SET id = ?, synced = 1 WHERE id = ?`,
            [serverId, entityId]
          );
        } else {
          const sqlite = getExpoDb();
          sqlite.runSync(
            `UPDATE local_tasks SET synced = 1 WHERE id = ?`,
            [entityId]
          );
        }
        break;
      }

      case 'UPDATE_TASK': {
        const { taskId, updates } = payload;
        await taskService.updateTask(taskId, updates);
        const sqlite = getExpoDb();
        sqlite.runSync(
          `UPDATE local_tasks SET synced = 1 WHERE id = ?`,
          [taskId]
        );
        break;
      }

      case 'DELETE_TASK': {
        const { taskId } = payload;
        await taskService.deleteTask(taskId);
        await taskRepository.deleteTask(taskId);
        break;
      }

      default:
        throw new Error(`Unknown sync action type: ${actionType}`);
    }
  }

  /**
   * Reset / clear queue (useful in tests & cleanups).
   */
  clearQueue(): void {
    const sqlite = getExpoDb();
    sqlite.runSync(`DELETE FROM sync_queue`);
    this.notifyListeners();
  }
}

export const syncQueueService = new SyncQueueService();

