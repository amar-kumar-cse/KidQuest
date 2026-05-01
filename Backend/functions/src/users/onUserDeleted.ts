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
        // Delete parent's tasks
        const tasksSnap = await db.collection('Tasks').where('parentId', '==', uid).get();
        tasksSnap.forEach((doc) => batch.delete(doc.ref));

        // Delete parent's rewards
        const rewardsSnap = await db.collection('Rewards').where('parentId', '==', uid).get();
        rewardsSnap.forEach((doc) => batch.delete(doc.ref));

        // Unlink kids
        const linkedKids: string[] = userData.linkedKids || [];
        for (const kidId of linkedKids) {
          batch.update(db.collection('Users').doc(kidId), {
            linkedParentId: null,
          });
        }
      } else if (userData.role === 'kid') {
        // Delete kid's tasks
        const tasksSnap = await db.collection('Tasks').where('assignedToUid', '==', uid).get();
        tasksSnap.forEach((doc) => batch.delete(doc.ref));

        // Remove from parent's linkedKids array
        if (userData.linkedParentId) {
          batch.update(db.collection('Users').doc(userData.linkedParentId), {
            linkedKids: admin.firestore.FieldValue.arrayRemove(uid),
          });
        }
      }

      // Finally delete the user doc itself
      batch.delete(userRef);

      await batch.commit();
      console.log(`Successfully cleaned up data for deleted user: ${uid}`);
    } catch (error) {
      console.error(`Error cleaning up data for user ${uid}:`, error);
    }
  });
