import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

export interface AISuggestionCardProps {
  isLoading?: boolean;
  error?: string | null;
  suggestions?: string[] | null;
  onRetry?: () => void;
  title?: string;
}

export function AISuggestionCard({
  isLoading = false,
  error = null,
  suggestions = [],
  onRetry,
  title = 'AI Study & Habit Recommendations',
}: AISuggestionCardProps) {
  // 1. Loading State
  if (isLoading) {
    return (
      <View
        testID="ai-suggestion-loading"
        className="bg-purple-50 rounded-2xl p-5 border border-purple-100 shadow-sm items-center justify-center my-3"
      >
        <ActivityIndicator size="small" color="#7c3aed" testID="ai-loading-indicator" />
        <Text className="text-purple-700 font-medium text-sm mt-2">
          Generating smart study recommendations...
        </Text>
      </View>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <View
        testID="ai-suggestion-error"
        className="bg-red-50 rounded-2xl p-4 border border-red-200 my-3"
      >
        <Text className="text-red-800 font-bold text-sm mb-1">
          Failed to load suggestions
        </Text>
        <Text className="text-red-600 text-xs mb-3">{error}</Text>
        {onRetry && (
          <TouchableOpacity
            testID="ai-retry-button"
            onPress={onRetry}
            activeOpacity={0.8}
            className="bg-red-600 px-3 py-1.5 rounded-lg self-start"
          >
            <Text className="text-white text-xs font-semibold">Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // 3. Data State
  if (!suggestions || suggestions.length === 0) {
    return (
      <View
        testID="ai-suggestion-empty"
        className="bg-slate-50 rounded-2xl p-4 border border-slate-200 my-3"
      >
        <Text className="text-slate-500 text-sm text-center">
          No recommendations available at this time.
        </Text>
      </View>
    );
  }

  return (
    <View
      testID="ai-suggestion-card"
      className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-100 shadow-sm my-3"
    >
      <View className="flex-row items-center mb-2.5">
        <Text className="text-base mr-2">🤖</Text>
        <Text className="text-sm font-bold text-purple-900 flex-1">{title}</Text>
      </View>
      <View className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <View
            key={index}
            testID={`ai-suggestion-item-${index}`}
            className="flex-row items-start bg-white/80 p-2.5 rounded-xl"
          >
            <Text className="text-purple-600 mr-2 text-xs">✦</Text>
            <Text className="text-slate-700 text-xs flex-1 leading-4">
              {suggestion}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default AISuggestionCard;
