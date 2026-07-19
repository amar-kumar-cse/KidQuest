import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const onUserDeleted = functions
  .region('asia-south1')
  .auth.user()
  .onDelete(async (user) => {
    const uid = user.uid;
    const db = admin.firestore();

    try {
      const userRef = db.collection('Users').doc(uid);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        console.log(`User ${uid} deleted from Auth, but no Firestore doc found.`);
        return;
      }

      const userData = userSnap.data() as any;

      const batch = db.batch();

      if (userData.role === 'parent') {
        const bucket = admin.storage().bucket();

        // Delete parent's tasks
        const tasksSnap = await db.collection('Tasks').where('parentId', '==', uid).get();
        tasksSnap.forEach((doc) => batch.delete(doc.ref));

        // Delete parent's rewards
        const rewardsSnap = await db.collection('Rewards').where('parentId', '==', uid).get();
        rewardsSnap.forEach((doc) => batch.delete(doc.ref));

        // Delete parent's family codes
        const codesSnap = await db.collection('FamilyCodes').where('parentId', '==', uid).get();
        codesSnap.forEach((doc) => batch.delete(doc.ref));

        // Recursively delete all linked kids and their data
        const linkedKids: string[] = userData.linkedKids || [];
        for (const kidId of linkedKids) {
          // Delete kid's auth user
          try {
            await admin.auth().deleteUser(kidId);
          } catch (e) {
            console.warn(`[onUserDeleted] Failed to delete kid auth user ${kidId}:`, e);
          }

          // Delete kid's tasks
          const kidTasksSnap = await db.collection('Tasks').where('assignedToUid', '==', kidId).get();
          kidTasksSnap.forEach((doc) => batch.delete(doc.ref));

          // Delete kid's notifications
          const kidNotifsSnap = await db.collection('Notifications').where('recipientId', '==', kidId).get();
          kidNotifsSnap.forEach((doc) => batch.delete(doc.ref));

          // Delete kid's reward claims
          const kidClaimsSnap = await db.collection('RewardClaims').where('kidId', '==', kidId).get();
          kidClaimsSnap.forEach((doc) => batch.delete(doc.ref));

          // Delete kid user doc
          batch.delete(db.collection('Users').doc(kidId));

          // Delete kid's storage avatar & proofs
          await bucket.deleteFiles({ prefix: `avatars/${kidId}` }).catch(() => {});
          
          // Delete kid's task proofs from storage
          kidTasksSnap.forEach((t) => {
            bucket.deleteFiles({ prefix: `proofs/${t.id}` }).catch(() => {});
          });
        }

        // Delete parent's storage avatar
        await bucket.deleteFiles({ prefix: `avatars/${uid}` }).catch(() => {});
      } else if (userData.role === 'kid') {
        const bucket = admin.storage().bucket();

        // Delete kid's tasks
        const tasksSnap = await db.collection('Tasks').where('assignedToUid', '==', uid).get();
        tasksSnap.forEach((doc) => {
          batch.delete(doc.ref);
          bucket.deleteFiles({ prefix: `proofs/${doc.id}` }).catch(() => {});
        });

        // Delete kid's notifications
        const notificationsSnap = await db.collection('Notifications').where('recipientId', '==', uid).get();
        notificationsSnap.forEach((doc) => batch.delete(doc.ref));

        // Delete kid's reward claims
        const claimsSnap = await db.collection('RewardClaims').where('kidId', '==', uid).get();
        claimsSnap.forEach((doc) => batch.delete(doc.ref));

        // Remove from parent's linkedKids array
        if (userData.linkedParentId) {
          batch.update(db.collection('Users').doc(userData.linkedParentId), {
            linkedKids: admin.firestore.FieldValue.arrayRemove(uid),
          });
        }

        // Delete storage avatars
        await bucket.deleteFiles({ prefix: `avatars/${uid}` }).catch(() => {});
      }

      // Finally delete the user doc itself
      batch.delete(userRef);

      await batch.commit();
      console.log(`Successfully cleaned up data for deleted user: ${uid}`);
    } catch (error) {
      console.error(`Error cleaning up data for user ${uid}:`, error);
    }
  });
