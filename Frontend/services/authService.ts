import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  deleteUser,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { AppUser, UserRole } from '../types';

// ─── Auth Service ─────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Register a new parent account.
   */
  async registerParent(email: string, password: string, name: string): Promise<void> {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'Users', user.uid), {
      uid: user.uid,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role: 'parent' as UserRole,
      linkedKids: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Register a new kid account.
   */
  async registerKid(
    email: string,
    password: string,
    name: string,
    age?: number,
  ): Promise<void> {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'Users', user.uid), {
      uid: user.uid,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      age: age ?? null,
      role: 'kid' as UserRole,
      linkedParentId: null,
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
   * Delete the current user's account.
   */
  async deleteAccount(): Promise<void> {
    const user = auth.currentUser;
    if (user) {
      await deleteUser(user);
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
