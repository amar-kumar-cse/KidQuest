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
exports.deleteAccount = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * deleteAccount callable
 * - Authenticated users may request deletion of their account.
 * - This function will:
 *   1) delete user-related Firestore documents (Users doc, Tasks, Notifications, AISuggestions, RewardClaims)
 *   2) remove user files in Storage under avatars/{uid} and proofs/{uid} (best-effort)
 *   3) delete the Firebase Auth user
 *
 * Note: This is best-effort and may take time; clients should poll for completion status if needed.
 */
exports.deleteAccount = functions.https.onCall(async (data, context) => {
    if (!context.auth)
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
    const uid = context.auth.uid;
    const db = admin.firestore();
    // Verify user exists (optional) and create a DeletionJob
    const userRef = db.collection('Users').doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : {};
    const familyId = userData.familyId || null;
    const jobRef = db.collection('DeletionJobs').doc();
    const now = admin.firestore.Timestamp.now();
    await jobRef.set({
        uid,
        familyId,
        requestedBy: uid,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
    });
    // Return job id so client may poll for status
    return { success: true, jobId: jobRef.id, message: 'Deletion job queued' };
});
//# sourceMappingURL=deleteAccount.js.map