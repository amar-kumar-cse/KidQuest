import { syncQueueService } from '../../lib/syncQueueService';
import { getExpoDb } from '../../lib/db';
import NetInfo from '@react-native-community/netinfo';
import { taskService } from '../../services/taskService';
import { storageService } from '../../services/storageService';

describe('syncQueueService', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = getExpoDb();
  });

  describe('calculateBackoff', () => {
    it('calculates exponential backoff within bounds for different retries', () => {
      // 0 retries: base 1000 + jitter (0..500)
      const delay0 = syncQueueService.calculateBackoff(0);
      expect(delay0).toBeGreaterThanOrEqual(1000);
      expect(delay0).toBeLessThanOrEqual(1500);

      // 1 retry: base 2000 + jitter
      const delay1 = syncQueueService.calculateBackoff(1);
      expect(delay1).toBeGreaterThanOrEqual(2000);
      expect(delay1).toBeLessThanOrEqual(2500);

      // 2 retries: base 4000 + jitter
      const delay2 = syncQueueService.calculateBackoff(2);
      expect(delay2).toBeGreaterThanOrEqual(4000);
      expect(delay2).toBeLessThanOrEqual(4500);

      // 6 retries: should be capped at 30,000 + jitter
      const delay6 = syncQueueService.calculateBackoff(6);
      expect(delay6).toBeGreaterThanOrEqual(30000);
      expect(delay6).toBeLessThanOrEqual(30500);
    });
  });

  describe('enqueue', () => {
    it('inserts a pending record into SQLite sync_queue', async () => {
      const actionId = await syncQueueService.enqueue('CREATE_TASK', 'temp-123', {
        title: 'Clean Bedroom',
      });

      expect(actionId).toMatch(/^sync_\d+_/);
      expect(mockDb.runSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sync_queue'),
        expect.arrayContaining([
          expect.any(String),
          'CREATE_TASK',
          'temp-123',
          JSON.stringify({ title: 'Clean Bedroom' }),
          5,
          expect.any(Number),
        ])
      );
    });
  });

  describe('processQueue', () => {
    it('skips processing if network is offline', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({
        isConnected: false,
        isInternetReachable: false,
      });

      await syncQueueService.processQueue();

      expect(mockDb.getAllSync).not.toHaveBeenCalled();
    });

    it('processes SUBMIT_PROOF and uploads photo if online', async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({
        isConnected: true,
        isInternetReachable: true,
      });

      mockDb.getAllSync.mockReturnValueOnce([
        {
          id: 'sync_1',
          action_type: 'SUBMIT_PROOF',
          entity_id: 'task-99',
          payload: JSON.stringify({
            taskId: 'task-99',
            localUri: 'file:///data/photo.jpg',
            proofNote: 'Done cleanly!',
          }),
          retry_count: 0,
          max_retries: 5,
          status: 'pending',
          last_attempt_at: null,
          created_at: Date.now() - 5000,
        },
      ]);

      const uploadSpy = jest
        .spyOn(storageService, 'uploadProofPhoto')
        .mockResolvedValueOnce('https://storage.googleapis.com/proof.jpg');
      const submitSpy = jest
        .spyOn(taskService, 'submitProof')
        .mockResolvedValueOnce(undefined);

      await syncQueueService.processQueue();

      expect(uploadSpy).toHaveBeenCalledWith('file:///data/photo.jpg', 'task-99');
      expect(submitSpy).toHaveBeenCalledWith(
        'task-99',
        'https://storage.googleapis.com/proof.jpg',
        'Done cleanly!'
      );
      // Item deleted from sync_queue on success
      expect(mockDb.runSync).toHaveBeenCalledWith(
        'DELETE FROM sync_queue WHERE id = ?',
        ['sync_1']
      );
    });
  });
});

