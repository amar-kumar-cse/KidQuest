import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { generateAndSendReportsForParent } from './weeklyReportJob';

export interface SendTestReportRequest {
  userId?: string;
}

/**
 * 5. Manual trigger endpoint (HTTPS callable) for testing:
 * Allows a parent or administrator to immediately generate and dispatch their weekly progress report.
 */
export const sendTestReport = functions
  .region('asia-south1')
  .https.onCall(async (data: SendTestReportRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to request a test report.');
    }

    const db = admin.firestore();
    const callerUid = context.auth.uid;
    const targetUserId = data?.userId || callerUid;

    // Permissions check: caller must be target user or admin
    if (targetUserId !== callerUid) {
      const callerDoc = await db.collection('Users').doc(callerUid).get();
      const callerData = callerDoc.data() || {};
      if (callerData.role !== 'admin') {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Only administrators can trigger test reports for another user.'
        );
      }
    }

    try {
      const result = await generateAndSendReportsForParent(targetUserId, db);
      return {
        success: true,
        message: `Weekly report generated and emailed for ${result.sentCount} child(ren).`,
        sentCount: result.sentCount,
        children: result.children,
      };
    } catch (err: any) {
      console.error('[sendTestReport] Execution error:', err);
      throw new functions.https.HttpsError('internal', err?.message || 'Failed to generate weekly report.');
    }
  });
