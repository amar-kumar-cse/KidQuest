import * as admin from 'firebase-admin';

export type AdminConfig = {
  MAX_ACTIVE_TASKS?: number;
  INACTIVITY_DAYS?: number;
  AI_CONFIDENCE_THRESHOLD?: number;
};

export async function getAdminConfig(db?: admin.firestore.Firestore): Promise<AdminConfig> {
  const _db = db || admin.firestore();
  try {
    const doc = await _db.collection('adminConfig').doc('main').get();
    if (!doc.exists) return { MAX_ACTIVE_TASKS: 10, INACTIVITY_DAYS: 2, AI_CONFIDENCE_THRESHOLD: 0.9 };
    const data = doc.data() as any;
    return {
      MAX_ACTIVE_TASKS: typeof data?.MAX_ACTIVE_TASKS === 'number' ? data.MAX_ACTIVE_TASKS : 10,
      INACTIVITY_DAYS: typeof data?.INACTIVITY_DAYS === 'number' ? data.INACTIVITY_DAYS : 2,
      AI_CONFIDENCE_THRESHOLD: typeof data?.AI_CONFIDENCE_THRESHOLD === 'number' ? data.AI_CONFIDENCE_THRESHOLD : 0.9,
    };
  } catch (err) {
    console.warn('Failed to read adminConfig, falling back to defaults', err && err.toString());
    return { MAX_ACTIVE_TASKS: 10, INACTIVITY_DAYS: 2, AI_CONFIDENCE_THRESHOLD: 0.9 };
  }
}
