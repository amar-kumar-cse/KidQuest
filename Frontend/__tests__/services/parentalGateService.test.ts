import { parentalGateService, hashPin } from '../../services/parentalGateService';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../../lib/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn().mockResolvedValue({
    exists: () => false,
    data: () => ({}),
  }),
  updateDoc: jest.fn().mockResolvedValue(undefined),
}));

describe('parentalGateService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    parentalGateService.lockGate();
    await AsyncStorage.clear();
  });

  describe('hashPin', () => {
    it('produces deterministic 64-char hex SHA-256 hash', () => {
      const hash1 = hashPin('1234');
      const hash2 = hashPin('1234');
      const hash3 = hashPin('9876');

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });
  });

  describe('PIN management', () => {
    it('rejects non-4-digit PIN', async () => {
      await expect(parentalGateService.setParentPin('parent-1', '12')).rejects.toThrow();
      await expect(parentalGateService.setParentPin('parent-1', 'abcd')).rejects.toThrow();
      await expect(parentalGateService.setParentPin('parent-1', '12345')).rejects.toThrow();
    });

    it('sets and verifies valid 4-digit PIN correctly', async () => {
      await parentalGateService.setParentPin('parent-1', '4321');
      const hasPin = await parentalGateService.hasPinSet('parent-1');
      expect(hasPin).toBe(true);

      const isCorrect = await parentalGateService.verifyPin('parent-1', '4321');
      expect(isCorrect).toBe(true);

      const isWrong = await parentalGateService.verifyPin('parent-1', '0000');
      expect(isWrong).toBe(false);
    });

    it('manages session unlocked state and expiration', async () => {
      expect(parentalGateService.isGateRecentlyUnlocked()).toBe(false);

      await parentalGateService.setParentPin('parent-1', '1111');
      expect(parentalGateService.isGateRecentlyUnlocked()).toBe(true);

      parentalGateService.lockGate();
      expect(parentalGateService.isGateRecentlyUnlocked()).toBe(false);
    });
  });

  describe('math challenge', () => {
    it('generates a valid challenge and verifies answer', () => {
      const challenge = parentalGateService.generateMathChallenge();
      expect(challenge.question).toBeDefined();
      expect(typeof challenge.answer).toBe('number');

      const pass = parentalGateService.verifyMathChallenge(challenge.answer, challenge.answer);
      expect(pass).toBe(true);
      expect(parentalGateService.isGateRecentlyUnlocked()).toBe(true);

      const fail = parentalGateService.verifyMathChallenge(challenge.answer + 5, challenge.answer);
      expect(fail).toBe(false);
    });
  });
});
