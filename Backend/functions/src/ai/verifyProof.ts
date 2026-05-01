import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import { getAdminConfig } from '../admin/adminConfig';

/**
 * verifyProof callable
 * - Params: { imageUrl, taskDescription, childUid }
 * - Security: only parents in the same family may invoke this for their child
 * - Uses Gemini (or vision-enabled model) to verify if the photo matches the task description.
 * - Returns { match: boolean, confidence: number, details: string }
 */
export const verifyProof = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');

  const { imageUrl, taskDescription, childUid, taskId } = data as { imageUrl?: string; taskDescription?: string; childUid?: string; taskId?: string };
  if (!imageUrl || !taskDescription || !childUid || !taskId) throw new functions.https.HttpsError('invalid-argument', 'imageUrl, taskDescription, childUid and taskId required.');

  const db = admin.firestore();
  const callerRef = db.collection('Users').doc(context.auth.uid);
  const childRef = db.collection('Users').doc(childUid);
  const [callerSnap, childSnap] = await Promise.all([callerRef.get(), childRef.get()]);
  if (!callerSnap.exists || !childSnap.exists) throw new functions.https.HttpsError('not-found', 'User not found');
  const caller = callerSnap.data() as any;
  const child = childSnap.data() as any;

  if (caller.role !== 'parent') throw new functions.https.HttpsError('permission-denied', 'Only parents may request AI verification.');
  if (!caller.familyId || caller.familyId !== child.familyId) throw new functions.https.HttpsError('permission-denied', 'Parent and child must belong to same family.');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // No API configured — persist neutral verification and prompt manual review
    const now = admin.firestore.Timestamp.now();
    const verRef = db.collection('AIVerifications').doc();
    await verRef.set({ taskId, childUid, imageUrl, taskDescription, match: false, confidence: 0, details: 'AI not configured', createdAt: now, requestedBy: context.auth.uid, familyId: caller.familyId });
    return { success: true, match: false, confidence: 0, details: 'AI not configured; please review manually.' };
  }

  try {
    const prompt = `Given the task: "${taskDescription}", does this image at ${imageUrl} show successful completion? Answer with yes/no and confidence between 0-1 and a short reason.`;
    const resp = await axios.post(
      'https://api.example.com/v1/vision:analyze',
      { imageUrl, prompt },
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    const result = resp.data?.result || {};
    const match = !!result.match;
    const confidence = typeof result.confidence === 'number' ? result.confidence : 0;
    const details = result.details || '';

    // Persist verification
    const now = admin.firestore.Timestamp.now();
    const verRef = db.collection('AIVerifications').doc();
    await verRef.set({ taskId, childUid, imageUrl, taskDescription, match, confidence, details, createdAt: now, requestedBy: context.auth.uid, familyId: caller.familyId });

    // Use adminConfig to decide threshold
    const cfg = await getAdminConfig(db);
    const threshold = cfg.AI_CONFIDENCE_THRESHOLD || 0.9;

    // If high confidence, mark task with aiRecommendation and notify parent to approve
    if (confidence >= threshold) {
      const taskRef = db.collection('Tasks').doc(taskId);
      await taskRef.update({ aiRecommendation: { match, confidence, details }, aiRecommendedAt: now });

      const notifRef = db.collection('Notifications').doc();
      await notifRef.set({ recipientId: context.auth.uid, type: 'ai_suggestion', taskId, title: 'AI suggests approval', body: `AI confidence ${Math.round(confidence * 100)}% — check and approve.`, createdAt: now, familyId: caller.familyId });
    }

    return { success: true, match, confidence, details };
  } catch (err) {
    console.warn('AI verification failed:', err);
    return { success: false, error: 'AI verification failed', details: String(err) };
  }
});
