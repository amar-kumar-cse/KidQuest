import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { Reward } from '../../types';

interface RewardCardProps {
  reward: Reward;
  currentXp?: number;
  onClaim?: () => void;
  onEdit?: () => void;
  mode?: 'kid' | 'parent';
  isClaiming?: boolean;
}

export function RewardCard({
  reward,
  currentXp = 0,
  onClaim,
  onEdit,
  mode = 'kid',
  isClaiming = false,
}: RewardCardProps) {
  const canAfford = currentXp >= reward.xpCost;

  return (
    <View
      className={`bg-white rounded-2xl p-4 border shadow-sm ${
        !reward.isActive ? 'opacity-50 border-slate-100' : 'border-slate-100'
      }`}
    >
      {/* Icon + Title */}
      <View className="flex-row items-center mb-3">
        <View className="w-12 h-12 bg-indigo-50 rounded-2xl items-center justify-center mr-3">
          <Text className="text-2xl">{reward.iconEmoji}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-800" numberOfLines={1}>
            {reward.title}
          </Text>
          {reward.description && (
            <Text className="text-xs text-slate-400 mt-0.5" numberOfLines={2}>
              {reward.description}
            </Text>
          )}
        </View>
      </View>

      {/* XP Cost + Actions */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-xl">
          <Text className="text-yellow-600 font-bold text-sm">⭐ {reward.xpCost} XP</Text>
        </View>

        {mode === 'kid' && onClaim && (
          <TouchableOpacity
            onPress={onClaim}
            disabled={!canAfford || !reward.isActive || isClaiming}
            className={`px-4 py-2 rounded-xl ${
              canAfford && reward.isActive
                ? 'bg-indigo-600 active:bg-indigo-700'
                : 'bg-slate-100'
            }`}
          >
            <Text
              className={`font-bold text-sm ${
                canAfford && reward.isActive ? 'text-white' : 'text-slate-400'
              }`}
            >
              {isClaiming ? '...' : canAfford ? 'Redeem 🎁' : 'Need more XP'}
            </Text>
          </TouchableOpacity>
        )}

        {mode === 'parent' && onEdit && (
          <View className="flex-row space-x-2">
            <Text className="text-xs text-slate-400 self-center mr-2">
              Claimed: {reward.claimedCount}
            </Text>
            <TouchableOpacity
              onPress={onEdit}
              className="bg-slate-100 px-3 py-2 rounded-xl"
            >
              <Text className="text-slate-600 font-semibold text-sm">Edit</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
