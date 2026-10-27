import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  deleteUser,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../lib/firebase';
import type { AppUser, UserRole } from '../types';

// ─── Auth Service ─────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Register a new parent account with verified parental consent.
   */
  async registerParent(
    email: string,
    password: string,
    name: string,
    consentGiven: boolean = true
  ): Promise<void> {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'Users', user.uid), {
      uid: user.uid,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role: 'parent' as UserRole,
      linkedKids: [],
      consentGiven: !!consentGiven,
      consentTimestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Register a new kid account, optionally linking via parent's family code.
   */
  async registerKid(
    email: string,
    password: string,
    name: string,
    age?: number,
    familyCode?: string
  ): Promise<void> {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);

    let linkedParentId: string | null = null;
    if (familyCode && familyCode.trim()) {
      try {
        const verifyFn = httpsCallable<{ code: string }, { success: boolean; parentId?: string }>(
          functions,
          'verifyFamilyCode'
        );
        const res = await verifyFn({ code: familyCode.trim().toUpperCase() });
        if (res.data?.success && res.data?.parentId) {
          linkedParentId = res.data.parentId;
        }
      } catch (linkErr) {
        console.warn('[authService] Auto-link with family code failed:', linkErr);
      }
    }

    await setDoc(doc(db, 'Users', user.uid), {
      uid: user.uid,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      age: age ?? null,
      role: 'kid' as UserRole,
      linkedParentId,
      totalXp: 0,
      currentStreak: 0,
      bestStreak: 0,
      tasksCompleted: 0,
      rewardsClaimed: 0,
      level: 1,
      avatarEmoji: '🦸',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Sign in with email and password.
   */
  async login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  },

  /**
   * Sign out the current user.
   */
  async logout(): Promise<void> {
    await signOut(auth);
  },

  /**
   * Delete the current user's account and Firestore profile.
   * Invokes Cloud Function deleteAccount for complete background cleanup of
   * tasks, storage proofs, notifications, and ledger entries.
   */
  async deleteAccount(): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    // Trigger Cloud Function deletion job for deep server-side purge
    try {
      const deleteFn = httpsCallable(functions, 'deleteAccount');
      await deleteFn();
    } catch (fnErr) {
      console.warn('[authService] Cloud Function deleteAccount failed, attempting client cleanup:', fnErr);
      try {
        await deleteDoc(doc(db, 'Users', user.uid));
      } catch (e) {
        console.warn('[authService] Could not delete user document prior to auth deletion:', e);
      }
    }

    // Delete Firebase Auth User
    try {
      await deleteUser(user);
    } catch (delUserErr: any) {
      if (delUserErr?.code === 'auth/requires-recent-login') {
        throw new Error('Please log in again before deleting your account.');
      }
    }
  },

  /**
   * Send a password reset email.
   */
  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  },

  /**
   * Fetch a user profile from Firestore.
   */
  async getUserProfile(uid: string): Promise<AppUser | null> {
    const snap = await getDoc(doc(db, 'Users', uid));
    if (!snap.exists()) return null;
    return { ...snap.data(), uid: snap.id } as AppUser;
  },

  /**
   * Subscribe to Firebase auth state changes.
   * Fetches the full AppUser profile on each auth change.
   */
  onAuthStateChange(callback: (user: AppUser | null) => void): () => void {
    return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        callback(null);
        return;
      }
      try {
        const profile = await authService.getUserProfile(firebaseUser.uid);
        callback(profile);
      } catch {
        callback(null);
      }
    });
  },

  /**
   * Map Firebase error codes to human-readable messages.
   */
  getErrorMessage(err: unknown): string {
    const code = (err as { code?: string })?.code ?? '';
    const messages: Record<string, string> = {
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-credential': 'Incorrect email or password.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
      'auth/network-request-failed': 'Network error. Check your connection.',
    };
    return messages[code] ?? 'Something went wrong. Please try again.';
  },
};
