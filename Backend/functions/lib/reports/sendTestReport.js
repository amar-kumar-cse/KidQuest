"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTestReport = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const weeklyReportJob_1 = require("./weeklyReportJob");
/**
 * 5. Manual trigger endpoint (HTTPS callable) for testing:
 * Allows a parent or administrator to immediately generate and dispatch their weekly progress report.
 */
exports.sendTestReport = functions
    .region('asia-south1')
    .https.onCall(async (data, context) => {
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
            throw new functions.https.HttpsError('permission-denied', 'Only administrators can trigger test reports for another user.');
        }
    }
    try {
        const result = await (0, weeklyReportJob_1.generateAndSendReportsForParent)(targetUserId, db);
        return {
            success: true,
            message: `Weekly report generated and emailed for ${result.sentCount} child(ren).`,
            sentCount: result.sentCount,
            children: result.children,
        };
    }
    catch (err) {
        console.error('[sendTestReport] Execution error:', err);
        throw new functions.https.HttpsError('internal', err?.message || 'Failed to generate weekly report.');
    }
});
//# sourceMappingURL=sendTestReport.js.map