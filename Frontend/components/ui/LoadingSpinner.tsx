import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  message,
  size = 'large',
  color = '#6C63FF',
  fullScreen = false,
}: LoadingSpinnerProps) {
  return (
    <View
      className={`items-center justify-center ${fullScreen ? 'flex-1' : 'py-12'}`}
    >
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text className="text-slate-400 text-sm mt-3 font-medium">{message}</Text>
      )}
    </View>
  );
}
