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
exports.claimReward = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * Claim a reward — deducts XP from kid in a transaction.
 * Creates a RewardClaim record for parent to acknowledge.
 */
exports.claimReward = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
    }
    const { rewardId } = data;
    if (!rewardId || typeof rewardId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'rewardId is required.');
    }
    const db = admin.firestore();
    await db.runTransaction(async (tx) => {
        const rewardRef = db.collection('Rewards').doc(rewardId);
        const kidRef = db.collection('Users').doc(context.auth.uid);
        const [rewardSnap, kidSnap] = await Promise.all([
            tx.get(rewardRef),
            tx.get(kidRef),
        ]);
        if (!rewardSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Reward not found.');
        }
        const reward = rewardSnap.data();
        const kid = kidSnap.data();
        if (!reward.isActive) {
            throw new functions.https.HttpsError('failed-precondition', 'This reward is no longer available.');
        }
        // Verify this kid is linked to the reward's parent
        if (kid.linkedParentId !== reward.parentId) {
            throw new functions.https.HttpsError('permission-denied', 'Not authorized for this reward.');
        }
        const kidXp = kid.totalXp ?? 0;
        if (kidXp < reward.xpCost) {
            throw new functions.https.HttpsError('failed-precondition', `Not enough XP. You need ${reward.xpCost} but have ${kidXp}.`);
        }
        // Deduct XP from kid
        tx.update(kidRef, {
            totalXp: admin.firestore.FieldValue.increment(-reward.xpCost),
            rewardsClaimed: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Increment reward claimed count
        tx.update(rewardRef, {
            claimedCount: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Create claim record for parent to acknowledge delivery
        const claimRef = db.collection('RewardClaims').doc();
        tx.set(claimRef, {
            rewardId,
            rewardTitle: reward.title,
            rewardEmoji: reward.iconEmoji ?? '🎁',
            kidId: context.auth.uid,
            kidName: kid.name ?? 'Kid',
            parentId: reward.parentId,
            xpSpent: reward.xpCost,
            status: 'pending_delivery',
            claimedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    return { success: true };
});
//# sourceMappingURL=claimReward.js.map