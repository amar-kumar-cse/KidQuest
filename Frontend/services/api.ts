import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, storage, functions } from '../lib/firebase';

// ─── Types ────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'parent' | 'kid';
  totalXp?: number;
  tasksCompleted?: number;
  linkedParentId?: string | null;
  linkedKidIds?: string[];
  avatarEmoji?: string;
  pushToken?: string | null;
  hasCompletedOnboarding?: boolean;
  createdAt?: any;
}

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

// ─── Photo Upload ─────────────────────────────────────────────────────

/**
 * Upload a photo proof to Firebase Storage.
 * Returns the public download URL.
 * @param localUri  - Local file URI from expo-image-picker
 * @param taskId    - Task ID (used as filename for uniqueness)
 * @param onProgress - Optional callback for upload progress (0-100)
 */
export async function uploadProofPhoto(
  localUri: string,
  taskId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  // Convert local URI to a Blob
  const response = await fetch(localUri);
  const blob = await response.blob();

  // Build a unique Storage path: proofs/{taskId}/{timestamp}.jpg
  const timestamp = Date.now();
  const storageRef = ref(storage, `proofs/${taskId}/${timestamp}.jpg`);

  // Upload with progress tracking
  const uploadTask = uploadBytesResumable(storageRef, blob, {
    contentType: 'image/jpeg',
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.({
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          percentage: Math.round(percentage),
        });
      },
      (error) => {
        console.error('[uploadProofPhoto] Upload failed:', error);
        reject(new Error('Photo upload failed. Please check your connection and try again.'));
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
}

// ─── User Profile ─────────────────────────────────────────────────────

/**
 * Fetch a user's profile from Firestore by UID.
 * Returns null if not found.
 */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;
  try {
    const userSnap = await getDoc(doc(db, 'Users', uid));
    if (!userSnap.exists()) return null;
    return { uid, ...userSnap.data() } as UserProfile;
  } catch (error) {
    console.error('[fetchUserProfile] Error:', error);
    return null;
  }
}

/**
 * Create or update a user's profile in Firestore.
 * Uses merge: true so existing fields are preserved.
 */
export async function upsertUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  const userRef = doc(db, 'Users', uid);
  await setDoc(
    userRef,
    { ...data, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

// ─── Family Linking ──────────────────────────────────────────────────

/**
 * Link a kid to a parent using a 6-digit invite code stored in Firestore.
 * Parent creates code → Kid enters code → accounts are linked.
 *
 * Firestore path: FamilyCodes/{code} → { parentId, expiresAt }
 */
export async function linkKidToParent(
  kidUid: string,
  code: string
): Promise<{ success: boolean; parentId?: string; error?: string }> {
  try {
    const verifyFn = httpsCallable<{ code: string }, { success: boolean; parentId?: string; error?: string }>(functions, 'verifyFamilyCode');
    const result = await verifyFn({ code });
    if (result.data.success) {
      return { success: true, parentId: result.data.parentId };
    } else {
      return { success: false, error: result.data.error || 'Invalid or expired code.' };
    }
  } catch (error: any) {
    console.error('[linkKidToParent] Error:', error);
    return { success: false, error: error.message || 'Linking failed. Please try again.' };
  }
}

/**
 * Generate a 6-character alphanumeric family invite code for a parent.
 * Stores it in Firestore with a 24-hour expiry.
 */
export async function generateFamilyCode(parentUid: string): Promise<string> {
  try {
    const generateFn = httpsCallable<any, { success: boolean; code: string }>(functions, 'generateFamilyCode');
    const result = await generateFn();
    return result.data.code;
  } catch (error: any) {
    console.error('[generateFamilyCode] Error:', error);
    throw new Error(error.message || 'Failed to generate family code.');
  }
}
