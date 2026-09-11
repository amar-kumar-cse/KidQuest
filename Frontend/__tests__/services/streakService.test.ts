import { streakService, calculateStreak } from '../../services/streakService';

// Mock Firebase
jest.mock('../../lib/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((db, col, id) => ({ col, id })),
  getDoc: jest.fn(),
  setDoc: jest.fn().mockResolvedValue(undefined),
  serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' })),
  Timestamp: {
    fromDate: jest.fn((d: Date) => ({
      toDate: () => d,
    })),
  },
}));

describe('streakService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateStreak() pure logic', () => {
    it('initializes streak to 1 if no previous completion exists', () => {
      const result = calculateStreak(null, 0, 0, new Date('2026-09-10T10:00:00Z'));
      expect(result).toEqual({
        newStreak: 1,
        bestStreak: 1,
        isReset: false,
        isSameDay: false,
      });
    });

    it('does not increment streak if task completed on the same calendar day', () => {
      const morning = new Date('2026-09-10T08:00:00Z');
      const evening = new Date('2026-09-10T19:00:00Z');

      const result = calculateStreak(morning, 5, 10, evening);
      expect(result).toEqual({
        newStreak: 5,
        bestStreak: 10,
        isReset: false,
        isSameDay: true,
      });
    });

    it('increments streak by 1 if completed on the consecutive day', () => {
      const yesterday = new Date('2026-09-09T14:00:00Z');
      const today = new Date('2026-09-10T11:00:00Z');

      const result = calculateStreak(yesterday, 3, 5, today);
      expect(result).toEqual({
        newStreak: 4,
        bestStreak: 5,
        isReset: false,
        isSameDay: false,
      });
    });

    it('updates bestStreak when newStreak surpasses previous record', () => {
      const yesterday = new Date('2026-09-09T14:00:00Z');
      const today = new Date('2026-09-10T11:00:00Z');

      const result = calculateStreak(yesterday, 5, 5, today);
      expect(result).toEqual({
        newStreak: 6,
        bestStreak: 6,
        isReset: false,
        isSameDay: false,
      });
    });

    it('resets streak to 1 if user missed one or more days', () => {
      const threeDaysAgo = new Date('2026-09-07T10:00:00Z');
      const today = new Date('2026-09-10T10:00:00Z');

      const result = calculateStreak(threeDaysAgo, 12, 15, today);
      expect(result).toEqual({
        newStreak: 1,
        bestStreak: 15,
        isReset: true,
        isSameDay: false,
      });
    });
  });

  describe('updateStreak()', () => {
    it('fetches existing streak from firestore and saves updated streak', async () => {
      const { getDoc, setDoc } = require('firebase/firestore');

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          userId: 'kid-1',
          currentStreak: 2,
          bestStreak: 5,
          lastCompletedAt: {
            toDate: () => new Date('2026-09-09T10:00:00Z'),
          },
        }),
      });

      const result = await streakService.updateStreak('kid-1', new Date('2026-09-10T12:00:00Z'));

      expect(getDoc).toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ col: 'streaks', id: 'kid-1' }),
        expect.objectContaining({
          userId: 'kid-1',
          currentStreak: 3,
          bestStreak: 5,
        }),
        { merge: true }
      );
      expect(result.newStreak).toBe(3);
    });
  });

  describe('resetStreak()', () => {
    it('explicitly resets current streak to 0 while preserving bestStreak', async () => {
      const { getDoc, setDoc } = require('firebase/firestore');

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          userId: 'kid-1',
          currentStreak: 7,
          bestStreak: 14,
          lastCompletedAt: { toDate: () => new Date() },
        }),
      });

      await streakService.resetStreak('kid-1');

      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ col: 'streaks', id: 'kid-1' }),
        expect.objectContaining({
          userId: 'kid-1',
          currentStreak: 0,
          bestStreak: 14,
          lastCompletedAt: null,
        }),
        { merge: true }
      );
    });
  });
});
