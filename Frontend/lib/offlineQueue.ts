import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageService } from '../services/storageService';
import { taskService } from '../services/taskService';

const QUEUE_STORAGE_KEY = 'kidquest_offline_proof_queue';

interface QueuedProof {
  taskId: string;
  localUri: string;
  timestamp: number;
}

export const offlineQueue = {
  /**
   * Save a proof submission to the local offline queue.
   */
  async saveOfflineProof(taskId: string, localUri: string): Promise<void> {
    try {
      const existingQueueJson = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      const queue: QueuedProof[] = existingQueueJson ? JSON.parse(existingQueueJson) : [];
      
      // Prevent duplicates for the same task
      const filtered = queue.filter(item => item.taskId !== taskId);
      filtered.push({
        taskId,
        localUri,
        timestamp: Date.now()
      });

      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(filtered));
      console.log(`[offlineQueue] Saved offline proof for task ${taskId}`);
    } catch (error) {
      console.error('[offlineQueue] Failed to save offline proof:', error);
    }
  },

  /**
   * Get all queued proofs currently stored locally.
   */
  async getQueuedProofs(): Promise<QueuedProof[]> {
    try {
      const queueJson = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      return queueJson ? JSON.parse(queueJson) : [];
    } catch {
      return [];
    }
  },

  /**
   * Attempt to process all queued proofs in the background.
   * If upload succeeds, the item is removed from the queue.
   */
  async processOfflineQueue(): Promise<void> {
    try {
      const queue = await this.getQueuedProofs();
      if (queue.length === 0) return;

      console.log(`[offlineQueue] Attempting to process ${queue.length} offline proof(s)...`);

      const remainingQueue: QueuedProof[] = [];

      for (const item of queue) {
        try {
          // 1. Try uploading to storage
          console.log(`[offlineQueue] Background uploading proof for task ${item.taskId}...`);
          const downloadUrl = await storageService.uploadProofPhoto(
            item.localUri,
            item.taskId
          );

          // 2. Try updating Firestore status to pending_approval
          console.log(`[offlineQueue] Submitting task status for ${item.taskId}...`);
          await taskService.submitProof(item.taskId, downloadUrl);
          
          console.log(`[offlineQueue] Successfully uploaded and processed proof for task ${item.taskId}`);
        } catch (err: any) {
          // If it fails (likely due to offline/network issue), keep it in the queue for the next run
          console.warn(`[offlineQueue] Failed to process task ${item.taskId}, keeping in queue:`, err.message);
          remainingQueue.push(item);
        }
      }

      // Update stored queue
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remainingQueue));
    } catch (error) {
      console.error('[offlineQueue] Error processing queue:', error);
    }
  }
};
