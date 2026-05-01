import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Upload a photo proof to Firebase Storage.
 * Returns the public download URL.
 *
 * @param taskId     - Used as directory name for organisation
 * @param localUri   - Local file URI from expo-image-picker
 * @param onProgress - Optional callback with upload percentage (0–100)
 */
export async function uploadProofPhoto(
  taskId: string,
  localUri: string,
  onProgress?: (percentage: number) => void,
): Promise<string> {
  if (!taskId) throw new Error('Task ID is required for photo upload.');
  if (!localUri) throw new Error('No photo URI provided.');

  // Convert the local URI to a Blob
  const response = await fetch(localUri);
  if (!response.ok) throw new Error('Failed to read photo file.');
  const blob = await response.blob();

  // Unique path: proofs/{taskId}/{timestamp}.jpg
  const timestamp   = Date.now();
  const storageRef  = ref(storage, `proofs/${taskId}/${timestamp}.jpg`);
  const uploadTask  = uploadBytesResumable(storageRef, blob, {
    contentType: 'image/jpeg',
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
        );
        onProgress?.(pct);
      },
      (error) => {
        console.error('[storageService] Upload failed:', error);
        reject(
          new Error('Photo upload failed. Please check your connection and try again.'),
        );
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        } catch (e) {
          reject(new Error('Could not retrieve photo URL after upload.'));
        }
      },
    );
  });
}

/**
 * Build the Storage path for a task proof folder.
 * Useful for listing or deleting all proofs for a task.
 */
export function getProofStoragePath(taskId: string): string {
  return `proofs/${taskId}`;
}
