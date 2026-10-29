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
/**
 * verifyProof callable function (Phase 4 AI Integration)
 * - Params: { taskId, childUid, imageUrl, taskDescription }
 * - Uses Gemini 1.5 Flash Vision if GEMINI_API_KEY is configured
 * - Graceful fallback to manual parent review if AI key is missing or verification is inconclusive
 */
exports.verifyProof = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
    }
    const { taskId, childUid, imageUrl, taskDescription } = data;
    if (!taskId || !childUid || !imageUrl) {
        throw new functions.https.HttpsError('invalid-argument', 'taskId, childUid and imageUrl are required.');
    }
    const db = admin.firestore();
    const callerUid = context.auth.uid;
    const callerRef = db.collection('Users').doc(callerUid);
    const childRef = db.collection('Users').doc(childUid);
    const [callerSnap, childSnap] = await Promise.all([callerRef.get(), childRef.get()]);
    if (!callerSnap.exists || !childSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'User profile not found.');
    }
    const caller = callerSnap.data() || {};
    const child = childSnap.data() || {};
    const isAdmin = caller.role === 'admin' || context.auth.token.admin === true;
    if (caller.role !== 'parent' && !isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Only parents can request AI verification.');
    }
    const isLinked = (Array.isArray(caller.linkedKids) && caller.linkedKids.includes(childUid)) ||
        child.linkedParentId === callerUid ||
        (caller.familyId && child.familyId && caller.familyId === child.familyId) ||
        isAdmin;
    if (!isLinked) {
        throw new functions.https.HttpsError('permission-denied', 'Parent and child must be linked.');
    }
    const apiKey = process.env.GEMINI_API_KEY;
    let match = false;
    let confidence = 0.5;
    let details = 'Awaiting parent manual review.';
    // If Gemini API is configured, evaluate image proof
    if (apiKey) {
        try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            const prompt = `You are evaluating a photo proof submitted by a child for the chore/homework task: "${taskDescription || 'completed task'}".
Image URL: ${imageUrl}.
Determine if this image is a genuine attempt or likely shows completion of this task.
Respond with JSON containing:
- "match": boolean (true if image reasonably represents the completed chore/homework)
- "confidence": number between 0.0 and 1.0
- "details": 1 sentence explanation for parents`;
            const resp = await axios_1.default.post(endpoint, {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.2,
                    responseMimeType: 'application/json',
                },
            }, { timeout: 15000 });
            const rawText = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
                const parsed = JSON.parse(rawText);
                match = Boolean(parsed.match);
                confidence = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(parsed.confidence, 1)) : 0.5;
                details = String(parsed.details || 'Verification completed.');
            }
        }
        catch (err) {
            console.warn('[verifyProof] Gemini Vision verification failed, falling back to manual review:', err);
            details = 'AI inspection unavailable. Please verify visually.';
        }
    }
    // Persist verification audit record in AIVerifications collection
    const now = admin.firestore.Timestamp.now();
    const verRef = db.collection('AIVerifications').doc();
    await verRef.set({
        taskId,
        childUid,
        imageUrl,
        taskDescription: taskDescription || '',
        match,
        confidence,
        details,
        createdAt: now,
        requestedBy: callerUid,
    });
    return {
        success: true,
        match,
        confidence,
        details,
    };
});
//# sourceMappingURL=verifyProof.js.map