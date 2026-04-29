import React from 'react';
import { View, Text } from 'react-native';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = '📭', title, message, action }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-16 px-8">
      <Text className="text-5xl mb-4">{icon}</Text>
      <Text className="text-lg font-bold text-slate-700 text-center mb-2">{title}</Text>
      {message && (
        <Text className="text-slate-400 text-center text-sm leading-5 mb-6">{message}</Text>
      )}
      {action}
    </View>
  );
}
