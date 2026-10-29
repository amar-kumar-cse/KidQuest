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
 * Claim a reward (Phase 4 Server-Authoritative Gamification)
 * - Atomic Firestore Transaction:
 *   1. Verifies reward exists, is active, and kid has sufficient XP
 *   2. Deducts XP from kid and increments rewardsClaimed count
 *   3. Writes immutable debit audit record to XpLedger
 *   4. Creates RewardClaims record for parent to fulfill
 *   5. Sends in-app and Expo push notification to parent
 */
exports.claimReward = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to claim rewards.');
    }
    const { rewardId } = data;
    if (!rewardId || typeof rewardId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Valid rewardId is required.');
    }
    const db = admin.firestore();
    const kidUid = context.auth.uid;
    let rewardTitle = '';
    let parentId = '';
    let xpSpent = 0;
    let kidName = '';
    let remainingXp = 0;
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
        if (!kidSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Kid profile not found.');
        }
        const reward = rewardSnap.data() || {};
        const kid = kidSnap.data() || {};
        if (reward.isActive === false) {
            throw new functions.https.HttpsError('failed-precondition', 'This reward is currently inactive or out of stock.');
        }
        // Role check: caller must be a kid
        if (kid.role !== 'kid') {
            throw new functions.https.HttpsError('permission-denied', 'Only kids can claim rewards.');
        }
        // Relationship check (support linkedParentId, parentId, and familyId)
        const isAuthorized = (kid.linkedParentId && kid.linkedParentId === reward.parentId) ||
            (reward.parentId && kid.parentId === reward.parentId) ||
            (kid.familyId && reward.familyId && kid.familyId === reward.familyId);
        if (!isAuthorized) {
            throw new functions.https.HttpsError('permission-denied', 'You are not authorized to claim rewards from this catalog.');
        }
        // Rate limiting: 5-second cooldown to prevent accidental double-tap
        const now = admin.firestore.Timestamp.now();
        if (kid.lastClaimedAt instanceof admin.firestore.Timestamp) {
            const secondsSinceLast = now.seconds - kid.lastClaimedAt.seconds;
            if (secondsSinceLast < 5) {
                throw new functions.https.HttpsError('resource-exhausted', 'Please wait a few seconds before claiming another reward.');
            }
        }
        const kidXp = typeof kid.totalXp === 'number' ? kid.totalXp : 0;
        const xpCost = typeof reward.costXp === 'number'
            ? reward.costXp
            : (typeof reward.xpCost === 'number' ? reward.xpCost : 0);
        if (xpCost <= 0) {
            throw new functions.https.HttpsError('failed-precondition', 'Invalid reward cost configuration.');
        }
        if (kidXp < xpCost) {
            throw new functions.https.HttpsError('failed-precondition', `Not enough XP! You need ${xpCost} XP but have ${kidXp} XP.`);
        }
        rewardTitle = reward.title || 'Reward';
        parentId = reward.parentId || kid.linkedParentId;
        xpSpent = xpCost;
        kidName = kid.name || 'Your kid';
        remainingXp = kidXp - xpCost;
        // 1. Deduct XP from kid
        tx.update(kidRef, {
            totalXp: remainingXp,
            rewardsClaimed: admin.firestore.FieldValue.increment(1),
            lastClaimedAt: now,
            updatedAt: now,
        });
        // 2. Increment reward claim counter
        tx.update(rewardRef, {
            claimedCount: admin.firestore.FieldValue.increment(1),
            updatedAt: now,
        });
        // 3. Create claim request for parent review
        const claimRef = db.collection('RewardClaims').doc();
        tx.set(claimRef, {
            rewardId,
            rewardTitle,
            iconEmoji: reward.iconEmoji || '🎁',
            kidId: kidUid,
            kidName,
            parentId,
            costXp: xpCost,
            status: 'pending',
            claimedAt: now,
        });
        // 4. Immutable XpLedger audit record (anti-cheat)
        const ledgerRef = db.collection('XpLedger').doc();
        tx.set(ledgerRef, {
            kidUid,
            parentId,
            amount: -xpCost,
            balanceAfter: remainingXp,
            type: 'reward_redeemed',
            referenceId: claimRef.id,
            description: `Redeemed reward: ${rewardTitle}`,
            timestamp: now,
        });
    });
    // Send push notification to parent (outside transaction)
    if (parentId) {
        try {
            const parentSnap = await db.collection('Users').doc(parentId).get();
            const parentData = parentSnap.exists ? parentSnap.data() : null;
            // In-app notification
            const notifRef = db.collection('Notifications').doc();
            await notifRef.set({
                recipientId: parentId,
                type: 'reward_claimed',
                title: '🎁 Reward Claimed!',
                body: `${kidName} redeemed "${rewardTitle}" for ${xpSpent} XP!`,
                createdAt: admin.firestore.Timestamp.now(),
                isRead: false,
            });
            // Expo Push notification
            const pushToken = parentData?.expoPushToken || parentData?.fcmToken;
            if (pushToken && typeof pushToken === 'string' && (pushToken.startsWith('ExponentPushToken[') || pushToken.startsWith('ExpoPushToken['))) {
                await axios_1.default.post('https://exp.host/--/api/v2/push/send', {
                    to: pushToken,
                    sound: 'default',
                    title: '🎁 Reward Claimed!',
                    body: `${kidName} redeemed "${rewardTitle}" for ${xpSpent} XP!`,
                    data: { type: 'reward_claimed', rewardId },
                }, { headers: { 'Content-Type': 'application/json' }, timeout: 10000 });
            }
        }
        catch (pushErr) {
            console.warn('[claimReward] Failed to dispatch parent notification:', pushErr);
        }
    }
    return {
        success: true,
        rewardTitle,
        xpSpent,
        remainingXp,
    };
});
//# sourceMappingURL=claimReward.js.map