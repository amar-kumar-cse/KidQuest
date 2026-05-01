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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyProof = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
const adminConfig_1 = require("../admin/adminConfig");
/**
 * verifyProof callable
 * - Params: { imageUrl, taskDescription, childUid }
 * - Security: only parents in the same family may invoke this for their child
 * - Uses Gemini (or vision-enabled model) to verify if the photo matches the task description.
 * - Returns { match: boolean, confidence: number, details: string }
 */
exports.verifyProof = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
    const { imageUrl, taskDescription, childUid, taskId } = data;
    if (!imageUrl || !taskDescription || !childUid || !taskId)
        throw new functions.https.HttpsError('invalid-argument', 'imageUrl, taskDescription, childUid and taskId required.');
    const db = admin.firestore();
    const callerRef = db.collection('Users').doc(context.auth.uid);
    const childRef = db.collection('Users').doc(childUid);
    const [callerSnap, childSnap] = await Promise.all([callerRef.get(), childRef.get()]);
    if (!callerSnap.exists || !childSnap.exists)
        throw new functions.https.HttpsError('not-found', 'User not found');
    const caller = callerSnap.data();
    const child = childSnap.data();
    if (caller.role !== 'parent')
        throw new functions.https.HttpsError('permission-denied', 'Only parents may request AI verification.');
    if (!caller.familyId || caller.familyId !== child.familyId)
        throw new functions.https.HttpsError('permission-denied', 'Parent and child must belong to same family.');
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
        const resp = await axios_1.default.post('https://api.example.com/v1/vision:analyze', { imageUrl, prompt }, { headers: { Authorization: `Bearer ${apiKey}` } });
        const result = resp.data?.result || {};
        const match = !!result.match;
        const confidence = typeof result.confidence === 'number' ? result.confidence : 0;
        const details = result.details || '';
        // Persist verification
        const now = admin.firestore.Timestamp.now();
        const verRef = db.collection('AIVerifications').doc();
        await verRef.set({ taskId, childUid, imageUrl, taskDescription, match, confidence, details, createdAt: now, requestedBy: context.auth.uid, familyId: caller.familyId });
        // Use adminConfig to decide threshold
        const cfg = await (0, adminConfig_1.getAdminConfig)(db);
        const threshold = cfg.AI_CONFIDENCE_THRESHOLD || 0.9;
        // If high confidence, mark task with aiRecommendation and notify parent to approve
        if (confidence >= threshold) {
            const taskRef = db.collection('Tasks').doc(taskId);
            await taskRef.update({ aiRecommendation: { match, confidence, details }, aiRecommendedAt: now });
            const notifRef = db.collection('Notifications').doc();
            await notifRef.set({ recipientId: context.auth.uid, type: 'ai_suggestion', taskId, title: 'AI suggests approval', body: `AI confidence ${Math.round(confidence * 100)}% — check and approve.`, createdAt: now, familyId: caller.familyId });
        }
        return { success: true, match, confidence, details };
    }
    catch (err) {
        console.warn('AI verification failed:', err);
        return { success: false, error: 'AI verification failed', details: String(err) };
    }
});
//# sourceMappingURL=verifyProof.js.map