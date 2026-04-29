import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { XPBar } from '../ui/XPBar';
import { StreakBadge } from '../ui/StreakBadge';
import { xpToNextLevel } from '../../constants/XP';
import type { Kid } from '../../types';

interface KidSummaryCardProps {
  kid: Kid;
  onPress?: () => void;
}

export function KidSummaryCard({ kid, onPress }: KidSummaryCardProps) {
  const xpProgress = xpToNextLevel(kid.totalXp ?? 0);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mb-3"
    >
      {/* Avatar + Name */}
      <View className="flex-row items-center mb-4">
        <View className="w-12 h-12 bg-indigo-100 rounded-full items-center justify-center mr-3">
          <Text className="text-2xl">{kid.avatarEmoji ?? '👦'}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-800">{kid.name}</Text>
          <Text className="text-xs text-slate-400">
            {kid.tasksCompleted ?? 0} tasks completed
          </Text>
        </View>
        <StreakBadge streak={kid.currentStreak ?? 0} size="sm" showLabel={false} />
      </View>

      {/* XP Bar */}
      <XPBar
        current={xpProgress.current}
        required={xpProgress.required}
        level={xpProgress.level}
        totalXp={kid.totalXp}
        size="sm"
      />
    </TouchableOpacity>
  );
}
