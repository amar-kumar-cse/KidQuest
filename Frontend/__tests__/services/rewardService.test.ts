import { rewardService } from '../../services/rewardService';

jest.mock('../../lib/firebase', () => ({ db: {}, functions: {} }));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn().mockResolvedValue({ id: 'reward-abc' }),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  serverTimestamp: jest.fn(() => ({})),
}));

jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(() => jest.fn().mockResolvedValue({ data: { success: true } })),
}));

describe('rewardService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createReward', () => {
    it('creates a reward and returns its ID', async () => {
      const id = await rewardService.createReward('parent-uid', {
        title: 'Extra Screen Time',
        xpCost: 200,
        iconEmoji: '🎮',
      });
      expect(id).toBe('reward-abc');
    });
  });

  describe('deleteReward', () => {
    it('calls deleteDoc', async () => {
      const { deleteDoc } = require('firebase/firestore');
      await rewardService.deleteReward('reward-abc');
      expect(deleteDoc).toHaveBeenCalled();
    });
  });

  describe('claimReward', () => {
    it('calls the claimReward Cloud Function', async () => {
      const { httpsCallable } = require('firebase/functions');
      await rewardService.claimReward('reward-abc');
      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'claimReward');
    });
  });
});
