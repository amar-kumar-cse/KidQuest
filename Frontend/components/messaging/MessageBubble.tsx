import React from 'react';
import { View, Text } from 'react-native';
import { ChatMessage } from '../../store/useChatStore';

export interface MessageBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
}

export function MessageBubble({ message, isCurrentUser }: MessageBubbleProps) {
  const date = new Date(message.timestamp);
  const timeFormatted = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View
      className={`my-1.5 max-w-[80%] ${
        isCurrentUser ? 'self-end items-end' : 'self-start items-start'
      }`}
    >
      {/* Sender Header (for other party) */}
      {!isCurrentUser && (
        <View className="flex-row items-center mb-1 ml-1">
          <Text className="text-xs font-bold text-slate-700 mr-1.5">
            {message.senderName}
          </Text>
          <View className="bg-indigo-100 px-1.5 py-0.5 rounded">
            <Text className="text-[9px] font-bold text-indigo-700 capitalize">
              {message.senderRole}
            </Text>
          </View>
        </View>
      )}

      {/* Bubble Container */}
      <View
        className={`px-4 py-2.5 rounded-2xl shadow-sm ${
          isCurrentUser
            ? 'bg-indigo-600 rounded-tr-none'
            : 'bg-white rounded-tl-none border border-slate-100'
        }`}
      >
        <Text
          className={`text-sm leading-5 ${
            isCurrentUser ? 'text-white' : 'text-slate-800'
          }`}
        >
          {message.text}
        </Text>

        {/* Timestamp & Status Footer */}
        <View className="flex-row items-center justify-end mt-1 space-x-1">
          <Text
            className={`text-[10px] ${
              isCurrentUser ? 'text-indigo-200' : 'text-slate-400'
            }`}
          >
            {timeFormatted}
          </Text>
          {isCurrentUser && (
            <Text className="text-[10px] text-indigo-200 ml-1">✓✓</Text>
          )}
        </View>
      </View>
    </View>
  );
}

export default MessageBubble;
