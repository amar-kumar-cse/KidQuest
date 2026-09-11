import { create } from 'zustand';
import {
  ref,
  push,
  set as dbSet,
  onValue,
  off,
  query,
  limitToLast,
  orderByChild,
  update,
} from 'firebase/database';
import { rtdb } from '../lib/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'parent' | 'teacher';
  text: string;
  timestamp: number;
  readBy?: Record<string, boolean>;
}

export interface ChatConversation {
  chatId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserRole: 'parent' | 'teacher';
  studentId: string;
  studentName: string;
  lastMessageText: string;
  lastMessageTimestamp: number;
  unreadCount: number;
  updatedAt: number;
}

export interface ChatState {
  conversations: ChatConversation[];
  activeChatId: string | null;
  messages: Record<string, ChatMessage[]>;
  totalUnreadCount: number;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  error: string | null;

  setActiveChatId: (chatId: string | null) => void;
  subscribeToConversations: (userId: string) => () => void;
  subscribeToMessages: (chatId: string) => () => void;
  sendMessage: (
    chatId: string,
    text: string,
    senderId: string,
    senderName: string,
    senderRole: 'parent' | 'teacher'
  ) => Promise<void>;
  markChatAsRead: (chatId: string, userId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeChatId: null,
  messages: {},
  totalUnreadCount: 0,
  isLoadingConversations: true,
  isLoadingMessages: false,
  error: null,

  setActiveChatId: (activeChatId) => set({ activeChatId }),

  /**
   * Subscribe to user's conversation index in Realtime Database.
   * Updates conversations array and aggregate total unread count.
   */
  subscribeToConversations: (userId: string) => {
    if (!userId) return () => {};

    set({ isLoadingConversations: true });
    const userChatsRef = query(
      ref(rtdb, `user_chats/${userId}`),
      orderByChild('updatedAt')
    );

    const listener = onValue(
      userChatsRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          set({
            conversations: [],
            totalUnreadCount: 0,
            isLoadingConversations: false,
          });
          return;
        }

        const rawData = snapshot.val() as Record<string, ChatConversation>;
        const list = Object.values(rawData).sort(
          (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
        );

        const totalUnread = list.reduce((sum, item) => sum + (item.unreadCount || 0), 0);

        set({
          conversations: list,
          totalUnreadCount: totalUnread,
          isLoadingConversations: false,
        });
      },
      (error) => {
        console.warn('[useChatStore] subscribeToConversations error:', error);
        set({ error: error.message, isLoadingConversations: false });
      }
    );

    return () => {
      off(userChatsRef, 'value', listener);
    };
  },

  /**
   * Subscribe to real-time message stream for a specific chat room.
   */
  subscribeToMessages: (chatId: string) => {
    if (!chatId) return () => {};

    set({ isLoadingMessages: true, activeChatId: chatId });
    const messagesRef = query(
      ref(rtdb, `chats/${chatId}/messages`),
      limitToLast(100)
    );

    const listener = onValue(
      messagesRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          set((state) => ({
            messages: { ...state.messages, [chatId]: [] },
            isLoadingMessages: false,
          }));
          return;
        }

        const rawMessages = snapshot.val() as Record<string, any>;
        const messageList: ChatMessage[] = Object.entries(rawMessages)
          .map(([id, msg]) => ({
            id,
            senderId: msg.senderId,
            senderName: msg.senderName,
            senderRole: msg.senderRole,
            text: msg.text,
            timestamp: msg.timestamp,
            readBy: msg.readBy || {},
          }))
          .sort((a, b) => a.timestamp - b.timestamp);

        set((state) => ({
          messages: { ...state.messages, [chatId]: messageList },
          isLoadingMessages: false,
        }));
      },
      (error) => {
        console.warn('[useChatStore] subscribeToMessages error:', error);
        set({ error: error.message, isLoadingMessages: false });
      }
    );

    return () => {
      off(messagesRef, 'value', listener);
    };
  },

  /**
   * Send a new message to the Realtime Database.
   */
  sendMessage: async (chatId, text, senderId, senderName, senderRole) => {
    const trimmed = text.trim();
    if (!trimmed || !chatId || !senderId) return;

    const messagesRef = ref(rtdb, `chats/${chatId}/messages`);
    const newMsgRef = push(messagesRef);
    const now = Date.now();

    const newMsgPayload = {
      id: newMsgRef.key,
      senderId,
      senderName,
      senderRole,
      text: trimmed,
      timestamp: now,
      readBy: {
        [senderId]: true,
      },
    };

    await dbSet(newMsgRef, newMsgPayload);
  },

  /**
   * Mark a conversation as read by resetting unreadCount to 0.
   */
  markChatAsRead: async (chatId: string, userId: string) => {
    if (!chatId || !userId) return;

    try {
      const updates: Record<string, any> = {};
      updates[`user_chats/${userId}/${chatId}/unreadCount`] = 0;
      await update(ref(rtdb), updates);
    } catch (err) {
      console.warn('[useChatStore] markChatAsRead error:', err);
    }
  },
}));

export default useChatStore;
