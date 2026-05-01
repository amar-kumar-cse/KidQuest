import React from 'react';
import { View, Text } from 'react-native';
import type { TaskStatus } from '../../types';

interface TaskStatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: 'To Do', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  pending_approval: { label: 'Awaiting Review', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  completed: { label: 'Completed', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  rejected: { label: 'Needs Redo', bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-400' },
};

export function TaskStatusBadge({ status, size = 'md' }: TaskStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <View className={`flex-row items-center px-3 py-1 rounded-full self-start ${config.bg}`}>
      <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${config.dot}`} />
      <Text className={`font-semibold ${textSize} ${config.text}`}>{config.label}</Text>
    </View>
  );
}
