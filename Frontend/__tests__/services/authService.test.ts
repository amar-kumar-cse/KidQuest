import { authService } from '../../services/authService';

jest.mock('../../lib/firebase', () => ({ auth: { currentUser: { uid: 'uid-123' } }, db: {}, functions: {} }));

jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(() => jest.fn().mockResolvedValue({ data: { success: true } })),
}));

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn().mockResolvedValue({ user: { uid: 'new-uid' } }),
  signInWithEmailAndPassword: jest.fn().mockResolvedValue({ user: { uid: 'uid-123' } }),
  signOut: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  onAuthStateChanged: jest.fn(() => jest.fn()),
  deleteUser: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn().mockResolvedValue(undefined),
  getDoc: jest.fn().mockResolvedValue({ exists: () => true, data: () => ({ role: 'parent', name: 'Test' }), id: 'uid-123' }),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  serverTimestamp: jest.fn(() => ({})),
}));

describe('authService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getErrorMessage', () => {
    it('maps auth/user-not-found to readable message', () => {
      const msg = authService.getErrorMessage({ code: 'auth/user-not-found' });
      expect(msg).toBe('No account found with this email.');
    });

    it('handles unknown errors gracefully', () => {
      const msg = authService.getErrorMessage({ code: 'auth/unknown' });
      expect(msg).toBe('Something went wrong. Please try again.');
    });
  });

  describe('login', () => {
    it('calls signInWithEmailAndPassword', async () => {
      const { signInWithEmailAndPassword } = require('firebase/auth');
      await authService.login('test@test.com', 'password123');
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'test@test.com', 'password123');
    });
  });

  describe('resetPassword', () => {
    it('calls sendPasswordResetEmail', async () => {
      const { sendPasswordResetEmail } = require('firebase/auth');
      await authService.resetPassword('test@test.com');
      expect(sendPasswordResetEmail).toHaveBeenCalled();
    });
  });

  describe('getUserProfile', () => {
    it('returns mapped user profile', async () => {
      const profile = await authService.getUserProfile('uid-123');
      expect(profile).not.toBeNull();
      expect(profile?.uid).toBe('uid-123');
    });
  });

  describe('registerParent', () => {
    it('saves verified parental consent in user document', async () => {
      const { setDoc } = require('firebase/firestore');
      await authService.registerParent('parent@test.com', 'pass123', 'Parent User', true);
      expect(setDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          role: 'parent',
          consentGiven: true,
        })
      );
    });
  });

  describe('deleteAccount', () => {
    it('invokes Cloud Function deleteAccount and deletes auth user', async () => {
      const { deleteUser } = require('firebase/auth');
      const { httpsCallable } = require('firebase/functions');
      await authService.deleteAccount();
      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'deleteAccount');
      expect(deleteUser).toHaveBeenCalled();
    });
  });
});
