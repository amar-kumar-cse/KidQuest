import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';

// ─── Storage Service ──────────────────────────────────────────────────────────

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

export const storageService = {
  /**
   * Upload a task proof photo to Firebase Storage.
   * Path: proofs/{taskId}/{timestamp}.jpg
   * Returns the public download URL.
   */
  async uploadProofPhoto(
    localUri: string,
    taskId: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<string> {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const timestamp = Date.now();
    const storageRef = ref(storage, `proofs/${taskId}/${timestamp}.jpg`);

    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: 'image/jpeg',
    });

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const percentage =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.({
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            percentage: Math.round(percentage),
          });
        },
        (error) => {
          console.error('[storageService] Upload failed:', error);
          reject(new Error('Photo upload failed. Please check your connection.'));
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        },
      );
    });
  },

  /**
   * Upload a user avatar to Firebase Storage.
   * Path: avatars/{userId}/{timestamp}.jpg
   * Returns the download URL.
   */
  async uploadAvatar(
    localUri: string,
    userId: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<string> {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const timestamp = Date.now();
    const storageRef = ref(storage, `avatars/${userId}/${timestamp}.jpg`);

    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: 'image/jpeg',
    });

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const percentage =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.({
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            percentage: Math.round(percentage),
          });
        },
        (error) => {
          console.error('[storageService] Avatar upload failed:', error);
          reject(new Error('Avatar upload failed.'));
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        },
      );
    });
  },

  /**
   * Delete a file from Firebase Storage by its full path.
   */
  async deleteFile(filePath: string): Promise<void> {
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
  },
};
