import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Scheduled function that runs daily and resets `currentStreak` to 0
 * for users who have not completed a task in the last 24 hours.
 */
export const resetDailyStreaks = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const db = admin.firestore();

    const threshold = Date.now() - 24 * 60 * 60 * 1000;

    // Find kids whose lastCompletedAt is older than 24h and currentStreak > 0
    const q = db.collection('Users').where('role', '==', 'kid').where('currentStreak', '>', 0);

    const snaps = await q.get();
    const batch = db.batch();
    let ops = 0;

    snaps.forEach((doc) => {
      const data: any = doc.data();
      const last = data.lastCompletedAt ? new Date(data.lastCompletedAt.seconds * 1000) : null;
      if (!last || last.getTime() < threshold) {
        batch.update(doc.ref, { currentStreak: 0, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        ops++;
      }
      if (ops === 500) {
        // commit and start a new batch if too many
        batch.commit();
      }
    });

    if (ops > 0) await batch.commit();

    return { success: true, updated: ops };
  });
