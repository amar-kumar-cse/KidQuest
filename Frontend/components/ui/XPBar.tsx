import React from 'react';
import { View, Text } from 'react-native';

interface XPBarProps {
  current: number;
  required: number;
  level: number;
  totalXp?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function XPBar({
  current,
  required,
  level,
  totalXp,
  showLabel = true,
  size = 'md',
}: XPBarProps) {
  const progressPercent = Math.min(100, Math.round((current / required) * 100));

  const barHeight = size === 'sm' ? 'h-2' : size === 'md' ? 'h-3' : 'h-4';

  return (
    <View>
      {showLabel && (
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-row items-center">
            <Text className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
              LVL {level}
            </Text>
            {totalXp !== undefined && (
              <Text className="text-xs text-slate-400 ml-2 font-medium">
                {totalXp.toLocaleString()} XP total
              </Text>
            )}
          </View>
          <Text className="text-xs text-slate-500 font-medium">
            {current}/{required} XP
          </Text>
        </View>
      )}
      <View className={`bg-slate-100 rounded-full overflow-hidden ${barHeight}`}>
        <View
          className={`bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full ${barHeight}`}
          style={{
            width: `${progressPercent}%`,
            backgroundColor: '#6C63FF',
          }}
        />
      </View>
    </View>
  );
}
