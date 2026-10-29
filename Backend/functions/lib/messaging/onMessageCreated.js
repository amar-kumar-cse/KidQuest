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
exports.onMessageCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
exports.onMessageCreated = functions
    .region('asia-south1')
    .database.ref('/chats/{chatId}/messages/{messageId}')
    .onCreate(async (snapshot, context) => {
    const { chatId, messageId } = context.params;
    const message = snapshot.val();
    if (!message)
        return;
    const rtdb = admin.database();
    const db = admin.firestore();
    const senderId = message.senderId;
    const senderName = message.senderName || 'KidQuest User';
    const text = message.text || '';
    const timestamp = message.timestamp || Date.now();
    // 1. Fetch chat metadata to identify participants
    const metaSnap = await rtdb.ref(`chats/${chatId}/metadata`).once('value');
    if (!metaSnap.exists()) {
        console.warn(`[onMessageCreated] Metadata not found for chat ${chatId}`);
        return;
    }
    const metadata = metaSnap.val();
    const parentId = metadata.parentId;
    const teacherId = metadata.teacherId;
    const studentName = metadata.studentName || 'Student';
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
    const updates = {};
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
        const recipientDoc = await db.collection('Users').doc(recipientId).get();
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
            await axios_1.default.post('https://exp.host/--/api/v2/push/send', payload, {
                headers: {
                    Accept: 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            });
            console.log(`[onMessageCreated] Push sent to ${recipientId} for chat ${chatId}`);
        }
    }
    catch (err) {
        console.warn('[onMessageCreated] Push notification delivery failed:', err?.message || err);
    }
});
//# sourceMappingURL=onMessageCreated.js.map