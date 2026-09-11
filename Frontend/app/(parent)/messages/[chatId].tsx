import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChatScreen } from '../../../components/messaging/ChatScreen';

export default function SingleChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    chatId: string;
    otherUserName?: string;
    otherUserRole?: 'parent' | 'teacher';
    studentName?: string;
  }>();

  return (
    <ChatScreen
      chatId={params.chatId || ''}
      otherUserName={params.otherUserName || 'Teacher'}
      otherUserRole={(params.otherUserRole as 'parent' | 'teacher') || 'teacher'}
      studentName={params.studentName || 'Student'}
      onBack={() => router.back()}
    />
  );
}
