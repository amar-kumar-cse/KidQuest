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
    const bucket = admin.storage?.().bucket?.();
    // Verify user exists
    const userRef = db.collection('Users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        // Still allow deleting auth user even if profile missing
        try {
            await admin.auth().deleteUser(uid);
        }
        catch (e) {
            // ignore
        }
        return { success: true, message: 'User profile not found; attempted auth deletion.' };
    }
    const userData = userSnap.data();
    const familyId = userData.familyId || null;
    // Helper to delete collection documents by query in batches
    async function deleteQueryBatch(collectionPath, query) {
        const snapshot = await query.limit(500).get();
        if (snapshot.empty)
            return 0;
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        return snapshot.size;
    }
    try {
        // Delete Tasks where assignedToUid == uid or parentId == uid
        let removed = 0;
        do {
            removed = await deleteQueryBatch('Tasks', db.collection('Tasks').where('assignedToUid', '==', uid));
        } while (removed > 0);
        do {
            removed = await deleteQueryBatch('Tasks', db.collection('Tasks').where('parentId', '==', uid));
        } while (removed > 0);
        // Notifications
        do {
            removed = await deleteQueryBatch('Notifications', db.collection('Notifications').where('recipientId', '==', uid));
        } while (removed > 0);
        // AISuggestions
        do {
            removed = await deleteQueryBatch('AISuggestions', db.collection('AISuggestions').where('requestedBy', '==', uid));
        } while (removed > 0);
        // AIVerifications
        do {
            removed = await deleteQueryBatch('AIVerifications', db.collection('AIVerifications').where('requestedBy', '==', uid));
        } while (removed > 0);
        // RewardClaims where kidId or parentId == uid
        do {
            removed = await deleteQueryBatch('RewardClaims', db.collection('RewardClaims').where('kidId', '==', uid));
        } while (removed > 0);
        do {
            removed = await deleteQueryBatch('RewardClaims', db.collection('RewardClaims').where('parentId', '==', uid));
        } while (removed > 0);
        // Delete user doc
        await userRef.delete();
        // Storage: best-effort deletions for avatars and proofs with uid in path
        if (bucket) {
            try {
                // avatars/{uid} prefix
                await bucket.deleteFiles({ prefix: `avatars/${uid}` });
            }
            catch (e) {
                console.warn('Failed to delete avatar files', e && e.toString());
            }
            try {
                // proofs/{familyId}/{taskId_uidpattern}
                if (familyId) {
                    await bucket.deleteFiles({ prefix: `proofs/${familyId}/` });
                }
            }
            catch (e) {
                console.warn('Failed to delete proof files', e && e.toString());
            }
        }
        // Finally, delete auth user
        try {
            await admin.auth().deleteUser(uid);
        }
        catch (e) {
            console.warn('Failed to delete auth user', e && e.toString());
        }
        return { success: true };
    }
    catch (err) {
        console.error('deleteAccount failed', err);
        throw new functions.https.HttpsError('internal', 'Account deletion failed');
    }
});
//# sourceMappingURL=deleteAccount.js.map