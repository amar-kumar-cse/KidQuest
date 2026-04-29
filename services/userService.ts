import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AppUser, Kid, Parent } from '../types';

// ─── User Service ─────────────────────────────────────────────────────────────

export const userService = {
  /**
   * Fetch a single user's profile from Firestore.
   */
  async getUserProfile(uid: string): Promise<AppUser | null> {
    const snap = await getDoc(doc(db, 'Users', uid));
    if (!snap.exists()) return null;
    return { ...snap.data(), uid: snap.id } as AppUser;
  },

  /**
   * Update mutable profile fields (name, avatarUrl, avatarEmoji, age, fcmToken).
   * Sensitive fields (XP, streak, etc.) are blocked by Firestore rules.
   */
  async updateProfile(
    uid: string,
    updates: {
      name?: string;
      avatarUrl?: string;
      avatarEmoji?: string;
      age?: number;
      fcmToken?: string;
    },
  ): Promise<void> {
    await updateDoc(doc(db, 'Users', uid), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Save the FCM push token for the given user.
   */
  async saveFcmToken(uid: string, token: string): Promise<void> {
    await updateDoc(doc(db, 'Users', uid), {
      fcmToken: token,
      notificationToken: token, // legacy compat
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Fetch multiple kid profiles by their UIDs.
   */
  async getKidProfiles(kidIds: string[]): Promise<Kid[]> {
    if (kidIds.length === 0) return [];
    const profiles = await Promise.all(
      kidIds.map(async (uid) => {
        const snap = await getDoc(doc(db, 'Users', uid));
        if (!snap.exists()) return null;
        return { ...snap.data(), uid: snap.id } as Kid;
      }),
    );
    return profiles.filter(Boolean) as Kid[];
  },
};
