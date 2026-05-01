import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import { getAdminConfig } from '../admin/adminConfig';

/**
 * Send nudges to kids who haven't completed any task in the last N days.
 */
export const sendInactivityNudges = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const db = admin.firestore();
    const cfg = await getAdminConfig(db);
    const DAYS = cfg.INACTIVITY_DAYS || parseInt(process.env.INACTIVITY_DAYS || '2', 10);
    const threshold = Date.now() - (DAYS * 24 * 60 * 60 * 1000);

    const q = db.collection('Users').where('role', '==', 'kid');
    const snaps = await q.get();
    const notifications: Array<Promise<any>> = [];

    snaps.forEach((doc) => {
      const data: any = doc.data();
      const last = data.lastCompletedAt ? new Date(data.lastCompletedAt.seconds * 1000) : null;
      if (!last || last.getTime() < threshold) {
        // Send Expo push if token exists
        const pushToken = data.expoPushToken;
        const message = `We miss you! Your streak may be at risk. Complete a task today to keep your streak going!`;
        if (pushToken) {
          const payload = { to: pushToken, sound: 'default', title: 'Come back!', body: message, data: { type: 'nudge' } };
          // Use Axios to send to Expo push endpoint (no SDK required)
          notifications.push(
            axios.post('https://exp.host/--/api/v2/push/send', payload, { headers: { 'Content-Type': 'application/json' } }).catch((e) => {
              console.warn('Push failed for', doc.id, e && e.toString());
            })
          );
        }

        // Write in-app notification
        const notifRef = db.collection('Notifications').doc();
        notifications.push(notifRef.set({ recipientId: doc.id, type: 'inactivity_nudge', title: 'We miss you', body: message, createdAt: admin.firestore.FieldValue.serverTimestamp(), isRead: false, familyId: data.familyId }));
      }
    });

    await Promise.all(notifications);
    return { success: true };
  });
