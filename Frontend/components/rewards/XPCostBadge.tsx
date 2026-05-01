import React from 'react';
import { View, Text } from 'react-native';

interface XPCostBadgeProps {
  cost: number;
  canAfford?: boolean;
}

export function XPCostBadge({ cost, canAfford = true }: XPCostBadgeProps) {
  return (
    <View
      className={`flex-row items-center px-3 py-1.5 rounded-xl border ${
        canAfford
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-slate-50 border-slate-200'
      }`}
    >
      <Text className="text-base mr-1">⭐</Text>
      <Text
        className={`font-bold text-sm ${
          canAfford ? 'text-yellow-700' : 'text-slate-400'
        }`}
      >
        {cost.toLocaleString()} XP
      </Text>
    </View>
  );
}
