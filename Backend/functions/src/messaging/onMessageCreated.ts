import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

export const onMessageCreated = functions
  .region('asia-south1')
  .database.ref('/chats/{chatId}/messages/{messageId}')
  .onCreate(async (snapshot, context) => {
    const { chatId, messageId } = context.params;
    const message = snapshot.val();
    if (!message) return;

    const rtdb = admin.database();
    const db = admin.firestore();

    const senderId: string = message.senderId;
    const senderName: string = message.senderName || 'KidQuest User';
    const text: string = message.text || '';
    const timestamp: number = message.timestamp || Date.now();

    // 1. Fetch chat metadata to identify participants
    const metaSnap = await rtdb.ref(`chats/${chatId}/metadata`).once('value');
    if (!metaSnap.exists()) {
      console.warn(`[onMessageCreated] Metadata not found for chat ${chatId}`);
      return;
    }

    const metadata = metaSnap.val();
    const parentId: string = metadata.parentId;
    const teacherId: string = metadata.teacherId;
    const studentName: string = metadata.studentName || 'Student';

    // Recipient is the other party in the conversation
    const recipientId = senderId === parentId ? teacherId : parentId;

    // 2. Update chat metadata lastMessage
    await rtdb.ref(`chats/${chatId}/metadata/lastMessage`).set({
      messageId,
      text,
      senderId,
      senderName,
      timestamp,
      readBy: {
        [senderId]: true,
        [recipientId]: false,
      },
    });

    // 3. Update conversation indices in user_chats
    const updates: Record<string, any> = {};

    // Sender's entry
    updates[`user_chats/${senderId}/${chatId}/lastMessageText`] = text;
    updates[`user_chats/${senderId}/${chatId}/lastMessageTimestamp`] = timestamp;
    updates[`user_chats/${senderId}/${chatId}/updatedAt`] = timestamp;

    // Recipient's entry
    updates[`user_chats/${recipientId}/${chatId}/lastMessageText`] = text;
    updates[`user_chats/${recipientId}/${chatId}/lastMessageTimestamp`] = timestamp;
    updates[`user_chats/${recipientId}/${chatId}/updatedAt`] = timestamp;

    await rtdb.ref().update(updates);

    // Atomically increment recipient unread count
    await rtdb
      .ref(`user_chats/${recipientId}/${chatId}/unreadCount`)
      .transaction((current) => (current || 0) + 1);

    // 4. Send push notification to recipient via Expo Push API
    try {
      const recipientDoc = await db.collection('users').doc(recipientId).get();
      const recipientData = recipientDoc.data() || {};
      const pushToken = recipientData.pushToken || recipientData.expoPushToken;

      if (pushToken && (pushToken.startsWith('ExponentPushToken[') || pushToken.startsWith('ExpoPushToken['))) {
        const preview = text.length > 100 ? `${text.substring(0, 97)}...` : text;

        const payload = {
          to: pushToken,
          sound: 'default',
          title: `💬 ${senderName} (${studentName})`,
          body: preview,
          data: {
            type: 'chat_message',
            chatId,
            senderId,
            studentName,
          },
          badge: 1,
          channelId: 'chat-messages',
        };

        await axios.post('https://exp.host/--/api/v2/push/send', payload, {
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        });

        console.log(`[onMessageCreated] Push sent to ${recipientId} for chat ${chatId}`);
      }
    } catch (err: any) {
      console.warn('[onMessageCreated] Push notification delivery failed:', err?.message || err);
    }
  });
