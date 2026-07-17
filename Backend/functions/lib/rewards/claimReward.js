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
exports.claimReward = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
/**
 * Claim a reward — deducts XP from kid in a transaction.
 * Creates a RewardClaim record for parent to acknowledge.
 * Sends push notification to parent.
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
    const kidUid = context.auth.uid;
    let rewardTitle = '';
    let parentId = '';
    let xpSpent = 0;
    let kidName = '';
    await db.runTransaction(async (tx) => {
        const rewardRef = db.collection('Rewards').doc(rewardId);
        const kidRef = db.collection('Users').doc(kidUid);
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
        // Verify kid role
        if (kid.role !== 'kid') {
            throw new functions.https.HttpsError('permission-denied', 'Only kids can claim rewards.');
        }
        // Verify this kid is in the same family as the reward
        if (!kid.familyId || kid.familyId !== reward.familyId) {
            throw new functions.https.HttpsError('permission-denied', 'Not authorized for this reward.');
        }
        // Rate Limiting: Prevent spamming claims
        const now = admin.firestore.Timestamp.now();
        if (kid.lastClaimedAt) {
            const secondsSinceLastClaim = now.seconds - kid.lastClaimedAt.seconds;
            if (secondsSinceLastClaim < 10) { // 10 second cooldown
                throw new functions.https.HttpsError('resource-exhausted', 'Please wait a moment before claiming another reward.');
            }
        }
        const kidXp = kid.totalXp ?? 0;
        const xpCost = reward.xpCost;
        if (kidXp < xpCost) {
            throw new functions.https.HttpsError('failed-precondition', `Not enough XP. You need ${xpCost} but have ${kidXp}.`);
        }
        // Store for notification
        rewardTitle = reward.title || 'a reward';
        parentId = reward.parentId;
        xpSpent = xpCost;
        kidName = kid.name || 'Your kid';
        // Deduct XP from kid
        tx.update(kidRef, {
            totalXp: admin.firestore.FieldValue.increment(-xpCost),
            rewardsClaimed: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastClaimedAt: admin.firestore.FieldValue.serverTimestamp(),
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
            kidId: kidUid,
            kidName: kid.name ?? 'Kid',
            parentId: reward.parentId,
            familyId: kid.familyId,
            xpSpent: xpCost,
            status: 'pending_delivery',
            claimedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    // Send push notification to parent (best-effort, outside transaction)
    if (parentId) {
        try {
            const parentSnap = await db.collection('Users').doc(parentId).get();
            const parentData = parentSnap.exists ? parentSnap.data() : null;
            // In-app notification
            const notifRef = db.collection('Notifications').doc();
            await notifRef.set({
                recipientId: parentId,
                type: 'reward_claimed',
                title: '🏆 Reward Claimed!',
                body: `${kidName} spent ${xpSpent} XP to claim "${rewardTitle}".`,
                createdAt: admin.firestore.Timestamp.now(),
                isRead: false,
                familyId: parentData?.familyId || null,
            });
            // Expo push
            const pushToken = parentData?.expoPushToken;
            if (pushToken && typeof pushToken === 'string') {
                await axios_1.default.post('https://exp.host/--/api/v2/push/send', {
                    to: pushToken,
                    sound: 'default',
                    title: '🏆 Reward Claimed!',
                    body: `${kidName} spent ${xpSpent} XP to claim "${rewardTitle}".`,
                    data: { type: 'reward_claimed', rewardId },
                }, { headers: { 'Content-Type': 'application/json' }, timeout: 5000 });
            }
        }
        catch (err) {
            console.warn('[claimReward] Parent notification failed:', err?.toString?.() || err);
        }
    }
    return { success: true };
});
//# sourceMappingURL=claimReward.js.map