import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export interface CreateOrGetChatRequest {
  parentId: string;
  teacherId: string;
  studentId: string;
}

export const createOrGetChat = functions
  .region('asia-south1')
  .https.onCall(async (data: CreateOrGetChatRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
    }

    const { parentId, teacherId, studentId } = data;
    if (!parentId || !teacherId || !studentId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'parentId, teacherId, and studentId are required.'
      );
    }

    const callerUid = context.auth.uid;
    const db = admin.firestore();
    const rtdb = admin.database();

    // 1. Authorization: caller must be either the parent, the teacher, or an admin
    const callerDoc = await db.collection('users').doc(callerUid).get();
    const callerData = callerDoc.data() || {};
    const isAdmin = callerData.role === 'admin';

    if (callerUid !== parentId && callerUid !== teacherId && !isAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You are not authorized to access or create this conversation.'
      );
    }

    // 2. Fetch profiles from Firestore to verify roles & names
    const [parentSnap, teacherSnap, studentSnap] = await Promise.all([
      db.collection('users').doc(parentId).get(),
      db.collection('users').doc(teacherId).get(),
      db.collection('users').doc(studentId).get(),
    ]);

    if (!parentSnap.exists || !teacherSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Parent or Teacher profile not found.');
    }

    const parentData = parentSnap.data() || {};
    const teacherData = teacherSnap.data() || {};
    const studentData = studentSnap.exists ? studentSnap.data() || {} : {};

    const parentName = parentData.name || 'Parent';
    const teacherName = teacherData.name || 'Teacher';
    const studentName = studentData.name || 'Student';

    // 3. Form deterministic chatId
    const chatId = `chat_${studentId}_${parentId}_${teacherId}`;
    const chatMetaRef = rtdb.ref(`chats/${chatId}/metadata`);

    const existingSnap = await chatMetaRef.once('value');
    if (existingSnap.exists()) {
      return {
        success: true,
        chatId,
        metadata: existingSnap.val(),
      };
    }

    // 4. Initialize chat room in Realtime Database
    const now = Date.now();
    const metadata = {
      chatId,
      parentId,
      parentName,
      teacherId,
      teacherName,
      studentId,
      studentName,
      createdAt: now,
      updatedAt: now,
      lastMessage: null,
    };

    const members = {
      [parentId]: true,
      [teacherId]: true,
    };

    const updates: Record<string, any> = {};
    // Main chat metadata & members
    updates[`chats/${chatId}/metadata`] = metadata;
    updates[`chats/${chatId}/members`] = members;

    // Parent conversation index
    updates[`user_chats/${parentId}/${chatId}`] = {
      chatId,
      otherUserId: teacherId,
      otherUserName: teacherName,
      otherUserRole: 'teacher',
      studentId,
      studentName,
      lastMessageText: 'Conversation started',
      lastMessageTimestamp: now,
      unreadCount: 0,
      updatedAt: now,
    };

    // Teacher conversation index
    updates[`user_chats/${teacherId}/${chatId}`] = {
      chatId,
      otherUserId: parentId,
      otherUserName: parentName,
      otherUserRole: 'parent',
      studentId,
      studentName,
      lastMessageText: 'Conversation started',
      lastMessageTimestamp: now,
      unreadCount: 0,
      updatedAt: now,
    };

    await rtdb.ref().update(updates);

    return {
      success: true,
      chatId,
      metadata,
    };
  });
