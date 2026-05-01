import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import { updateDoc } from 'firebase/firestore';

// ─── Family Service ───────────────────────────────────────────────────────────

/** Generate a readable 6-character alphanumeric code (no ambiguous chars) */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join('');
}

export const familyService = {
  /**
   * Generate and store a family invite code valid for 7 days.
   * Returns the 6-character code string.
   */
  async generateFamilyCode(parentId: string): Promise<string> {
    const code = generateCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Valid for 7 days

    await setDoc(doc(db, 'FamilyCodes', code), {
      parentId,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
    });

    // Save the code on the parent's profile for easy retrieval
    await updateDoc(doc(db, 'Users', parentId), {
      familyCode: code,
      updatedAt: serverTimestamp(),
    });

    return code;
  },

  /**
   * Verify a family code and link the kid to the parent.
   * Handled server-side via Cloud Function to prevent enumeration attacks.
   */
  async verifyAndLinkFamilyCode(
    code: string,
  ): Promise<{ success: boolean; parentName: string }> {
    const fn = httpsCallable(functions, 'verifyFamilyCode');
    const result = await fn({ code: code.toUpperCase().trim() });
    return result.data as { success: boolean; parentName: string };
  },
};
