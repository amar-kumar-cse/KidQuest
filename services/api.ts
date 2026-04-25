import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';

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
    const codeRef = doc(db, 'FamilyCodes', code.toUpperCase().trim());
    const codeSnap = await getDoc(codeRef);

    if (!codeSnap.exists()) {
      return { success: false, error: 'Invalid invite code. Please ask your parent for a new one.' };
    }

    const { parentId, expiresAt } = codeSnap.data();

    // Check expiry
    if (expiresAt && expiresAt.toDate() < new Date()) {
      return { success: false, error: 'This invite code has expired. Ask your parent for a new one.' };
    }

    // Link kid to parent in Firestore
    await updateDoc(doc(db, 'Users', kidUid), {
      linkedParentId: parentId,
    });

    // Add kid to parent's linkedKidIds array
    const parentSnap = await getDoc(doc(db, 'Users', parentId));
    if (parentSnap.exists()) {
      const existingKids: string[] = parentSnap.data().linkedKidIds || [];
      if (!existingKids.includes(kidUid)) {
        await updateDoc(doc(db, 'Users', parentId), {
          linkedKidIds: [...existingKids, kidUid],
        });
      }
    }

    return { success: true, parentId };
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
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await setDoc(doc(db, 'FamilyCodes', code), {
    parentId: parentUid,
    createdAt: serverTimestamp(),
    expiresAt,
  });

  return code;
}
