import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Claim a reward — deducts XP from kid in a transaction.
 * Creates a RewardClaim record for parent to acknowledge.
 */
export const claimReward = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
  }

  const { rewardId } = data as { rewardId: string };

  if (!rewardId || typeof rewardId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'rewardId is required.');
  }

  const db = admin.firestore();

  await db.runTransaction(async (tx) => {
    const rewardRef = db.collection('Rewards').doc(rewardId);
    const kidRef = db.collection('Users').doc(context.auth!.uid);

    const [rewardSnap, kidSnap] = await Promise.all([
      tx.get(rewardRef),
      tx.get(kidRef),
    ]);

    if (!rewardSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Reward not found.');
    }

    const reward = rewardSnap.data()!;
    const kid = kidSnap.data()!;

    if (!reward.isActive) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'This reward is no longer available.',
      );
    }

    // Verify this kid is linked to the reward's parent
    if (kid.linkedParentId !== reward.parentId) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Not authorized for this reward.',
      );
    }

    const kidXp = (kid.totalXp as number) ?? 0;
    if (kidXp < (reward.xpCost as number)) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Not enough XP. You need ${reward.xpCost} but have ${kidXp}.`,
      );
    }

    // Deduct XP from kid
    tx.update(kidRef, {
      totalXp: admin.firestore.FieldValue.increment(-(reward.xpCost as number)),
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
      kidId: context.auth!.uid,
      kidName: kid.name ?? 'Kid',
      parentId: reward.parentId,
      xpSpent: reward.xpCost,
      status: 'pending_delivery',
      claimedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { success: true };
});
