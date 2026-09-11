import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../lib/firebase';
import { useChatStore, ChatConversation } from '../../store/useChatStore';

export interface ConversationListScreenProps {
  onSelectConversation?: (conversation: ChatConversation) => void;
  onStartNewChat?: () => void;
}

export function ConversationListScreen({
  onSelectConversation,
  onStartNewChat,
}: ConversationListScreenProps) {
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid || '';

  const {
    conversations,
    isLoadingConversations,
    subscribeToConversations,
    totalUnreadCount,
  } = useChatStore();

  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribe = subscribeToConversations(currentUserId);
    return () => unsubscribe();
  }, [currentUserId]);

  const handleSelect = (conv: ChatConversation) => {
    if (onSelectConversation) {
      onSelectConversation(conv);
    } else {
      router.push({
        pathname: '/(parent)/messages/[chatId]',
        params: {
          chatId: conv.chatId,
          otherUserName: conv.otherUserName,
          otherUserRole: conv.otherUserRole,
          studentName: conv.studentName,
        },
      } as any);
    }
  };

  const renderConversationItem = ({ item }: { item: ChatConversation }) => {
    const isUnread = (item.unreadCount || 0) > 0;
    const date = item.lastMessageTimestamp
      ? new Date(item.lastMessageTimestamp)
      : new Date(item.updatedAt);
    const timeFormatted = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <TouchableOpacity
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
        className={`bg-white rounded-2xl p-4 mb-2.5 border flex-row items-center justify-between shadow-sm ${
          isUnread ? 'border-indigo-200 bg-indigo-50/20' : 'border-slate-100'
        }`}
      >
        {/* Left: Avatar */}
        <View className="w-12 h-12 rounded-2xl bg-indigo-100 items-center justify-center mr-3.5 relative">
          <Text className="text-xl">
            {item.otherUserRole === 'teacher' ? '👨‍🏫' : '👨‍👩‍👧'}
          </Text>
          {isUnread && (
            <View className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-600 rounded-full border-2 border-white" />
          )}
        </View>

        {/* Center: Details */}
        <View className="flex-1 mr-2">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center flex-1 mr-2">
              <Text
                className={`text-sm mr-2 ${
                  isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-800'
                }`}
                numberOfLines={1}
              >
                {item.otherUserName}
              </Text>
              <View className="bg-slate-100 px-1.5 py-0.5 rounded">
                <Text className="text-[9px] font-bold text-slate-600 capitalize">
                  {item.otherUserRole}
                </Text>
              </View>
            </View>
            <Text className="text-[10px] text-slate-400">{timeFormatted}</Text>
          </View>

          {/* Student context pill */}
          <Text className="text-[11px] text-indigo-600 font-medium mb-1">
            Student: {item.studentName}
          </Text>

          {/* Last message text preview */}
          <Text
            className={`text-xs ${
              isUnread ? 'font-bold text-slate-900' : 'text-slate-500'
            }`}
            numberOfLines={1}
          >
            {item.lastMessageText || 'No messages yet'}
          </Text>
        </View>

        {/* Right: Unread Badge */}
        {isUnread && (
          <View className="bg-indigo-600 px-2 py-0.5 rounded-full items-center justify-center ml-1">
            <Text className="text-white text-[10px] font-black">{item.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View className="bg-white px-6 py-4 border-b border-slate-100 flex-row items-center justify-between shadow-sm">
        <View>
          <Text className="text-xl font-black text-[#000080]">Messages</Text>
          <Text className="text-xs text-slate-400 mt-0.5">
            Direct & confidential parent-teacher channel
          </Text>
        </View>

        {onStartNewChat && (
          <TouchableOpacity
            onPress={onStartNewChat}
            className="w-10 h-10 rounded-xl bg-indigo-50 items-center justify-center border border-indigo-100"
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={20} color="#4F46E5" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {isLoadingConversations && conversations.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#4F46E5" />
          <Text className="text-xs text-slate-400 mt-2 font-medium">
            Loading conversations...
          </Text>
        </View>
      ) : conversations.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <View className="w-16 h-16 rounded-3xl bg-indigo-50 items-center justify-center mb-3">
            <Ionicons name="chatbubbles-outline" size={32} color="#4F46E5" />
          </View>
          <Text className="text-base font-bold text-slate-800 text-center">
            No Messages Yet
          </Text>
          <Text className="text-xs text-slate-500 text-center mt-1.5 leading-5 max-w-[280px]">
            Conversations with your child's teachers appear here. Messages are private and cannot be viewed by students.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.chatId}
          renderItem={renderConversationItem}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  );
}

export default ConversationListScreen;
