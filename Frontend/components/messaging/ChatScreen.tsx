import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../lib/firebase';
import { useChatStore, ChatMessage } from '../../store/useChatStore';
import { MessageBubble } from './MessageBubble';

export interface ChatScreenProps {
  chatId: string;
  otherUserName?: string;
  otherUserRole?: 'parent' | 'teacher';
  studentName?: string;
  onBack?: () => void;
}

export function ChatScreen({
  chatId,
  otherUserName = 'Teacher / Parent',
  otherUserRole = 'teacher',
  studentName = 'Student',
  onBack,
}: ChatScreenProps) {
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid || '';
  const currentUserName = auth.currentUser?.displayName || (otherUserRole === 'teacher' ? 'Parent' : 'Teacher');
  const currentUserRole: 'parent' | 'teacher' = otherUserRole === 'teacher' ? 'parent' : 'teacher';

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const {
    messages,
    isLoadingMessages,
    subscribeToMessages,
    sendMessage,
    markChatAsRead,
  } = useChatStore();

  const chatMessages: ChatMessage[] = messages[chatId] || [];

  // 1. Subscribe to messages in RTDB
  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = subscribeToMessages(chatId);
    markChatAsRead(chatId, currentUserId);

    return () => {
      unsubscribe();
    };
  }, [chatId]);

  // 2. Mark chat as read whenever messages update
  useEffect(() => {
    if (chatMessages.length > 0 && currentUserId) {
      markChatAsRead(chatId, currentUserId);
    }
  }, [chatMessages.length]);

  // 3. Send message handler
  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setInputText('');

    try {
      await sendMessage(chatId, trimmed, currentUserId, currentUserName, currentUserRole);
      // Auto-scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('[ChatScreen] Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View className="bg-white px-4 py-3 border-b border-slate-100 flex-row items-center justify-between shadow-sm">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            onPress={onBack || (() => router.back())}
            className="w-10 h-10 rounded-xl bg-slate-50 items-center justify-center mr-3"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#1e293b" />
          </TouchableOpacity>

          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-base font-bold text-slate-800 mr-2" numberOfLines={1}>
                {otherUserName}
              </Text>
              <View className="bg-indigo-50 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-bold text-indigo-700 capitalize">
                  {otherUserRole}
                </Text>
              </View>
            </View>
            <Text className="text-xs text-slate-500 mt-0.5">
              Regarding: <Text className="font-semibold text-slate-700">{studentName}</Text>
            </Text>
          </View>
        </View>

        {/* Security / Confidentiality Indicator */}
        <View className="flex-row items-center bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
          <Ionicons name="lock-closed" size={12} color="#059669" />
          <Text className="text-[10px] text-emerald-700 font-bold ml-1">Private</Text>
        </View>
      </View>

      {/* ── Message Stream ──────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoadingMessages && chatMessages.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="small" color="#4F46E5" />
            <Text className="text-xs text-slate-500 mt-2 font-medium">
              Connecting to secure channel...
            </Text>
          </View>
        ) : chatMessages.length === 0 ? (
          <View className="flex-1 items-center justify-center p-8">
            <View className="w-14 h-14 rounded-2xl bg-indigo-50 items-center justify-center mb-3">
              <Ionicons name="chatbubbles-outline" size={28} color="#4F46E5" />
            </View>
            <Text className="text-base font-bold text-slate-800 text-center">
              Direct Parent-Teacher Line
            </Text>
            <Text className="text-xs text-slate-500 text-center mt-1 leading-5 max-w-[260px]">
              Messages are secure and only visible to you and {otherUserName}. Children cannot see these conversations.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={chatMessages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isCurrentUser={item.senderId === currentUserId}
              />
            )}
          />
        )}

        {/* ── Bottom Input Bar ──────────────────────────────────────────────── */}
        <View className="bg-white p-3 border-t border-slate-100 flex-row items-center space-x-2">
          <View className="flex-1 bg-slate-100 rounded-2xl px-4 py-2 flex-row items-center border border-slate-200/60 mr-2">
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={1000}
              className="flex-1 text-sm text-slate-800 max-h-24 pt-0 pb-0"
            />
          </View>

          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
            className={`w-11 h-11 rounded-2xl items-center justify-center shadow-sm ${
              inputText.trim() && !isSending ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
            activeOpacity={0.8}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={inputText.trim() ? '#ffffff' : '#94a3b8'}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default ChatScreen;
