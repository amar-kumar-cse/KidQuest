import React from 'react';
import { View, Text } from 'react-native';

interface StreakBadgeProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function StreakBadge({ streak, size = 'md', showLabel = true }: StreakBadgeProps) {
  const isActive = streak > 0;
  const isHot = streak >= 3;
  const isOnFire = streak >= 7;

  const iconSizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' };
  const textSizes = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' };

  const icon = isOnFire ? '🔥' : isHot ? '⚡' : '📅';
  const bg = isOnFire
    ? 'bg-orange-100 border-orange-300'
    : isHot
    ? 'bg-yellow-100 border-yellow-300'
    : 'bg-slate-100 border-slate-200';

  const textColor = isOnFire
    ? 'text-orange-700'
    : isHot
    ? 'text-yellow-700'
    : 'text-slate-500';

  return (
    <View className={`flex-row items-center border rounded-xl px-3 py-1.5 ${bg}`}>
      <Text className={iconSizes[size]}>{icon}</Text>
      <Text className={`font-bold ml-1 ${textSizes[size]} ${textColor}`}>
        {streak}
      </Text>
      {showLabel && (
        <Text className={`ml-1 ${textColor} text-xs font-medium`}>
          {streak === 1 ? 'day' : 'days'}
        </Text>
      )}
    </View>
  );
}
