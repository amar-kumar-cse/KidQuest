import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { getCategoryDef } from '../../constants/TaskCategories';
import type { Task } from '../../types';

interface TaskCardProps {
  task: Task;
  onPress?: () => void;
  showKidName?: boolean;
}

const STATUS_CONFIG = {
  pending: { label: 'To Do', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  pending_approval: { label: 'Review', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  completed: { label: 'Done ✓', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  rejected: { label: 'Redo', bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-400' },
};

const DIFFICULTY_CONFIG = {
  easy: { label: 'Easy', color: 'text-green-600' },
  medium: { label: 'Medium', color: 'text-yellow-600' },
  hard: { label: 'Hard', color: 'text-red-500' },
};

export function TaskCard({ task, onPress, showKidName = false }: TaskCardProps) {
  const catDef = getCategoryDef(task.category);
  const status = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;
  const difficulty = DIFFICULTY_CONFIG[task.difficulty] ?? DIFFICULTY_CONFIG.easy;

  const dueDate = task.dueDate?.toDate?.() ?? new Date(task.dueDate);
  const isOverdue = dueDate < new Date() && task.status === 'pending';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="bg-white rounded-2xl p-4 mb-3 border border-slate-100 shadow-sm"
    >
      {/* Header */}
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-row items-center flex-1 mr-3">
          <View
            className="w-10 h-10 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: catDef.bg }}
          >
            <Text className="text-lg">{catDef.icon}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-slate-800" numberOfLines={1}>
              {task.title}
            </Text>
            {showKidName && (task.assignedToName || task.assignedTo) && (
              <Text className="text-xs text-slate-400 mt-0.5">
                👤 {task.assignedToName ?? task.assignedTo}
              </Text>
            )}
          </View>
        </View>
        {/* Status badge */}
        <View className={`flex-row items-center px-2.5 py-1 rounded-full ${status.bg}`}>
          <View className={`w-1.5 h-1.5 rounded-full mr-1 ${status.dot}`} />
          <Text className={`text-xs font-semibold ${status.text}`}>{status.label}</Text>
        </View>
      </View>

      {/* Description */}
      {task.description && (
        <Text className="text-slate-500 text-sm mb-3 leading-5" numberOfLines={2}>
          {task.description}
        </Text>
      )}

      {/* Footer */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center space-x-3">
          <Text className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
            +{task.finalXp ?? task.xp} XP
          </Text>
          <Text className={`text-xs font-medium ${difficulty.color}`}>
            {difficulty.label}
          </Text>
        </View>
        {isOverdue && (
          <Text className="text-xs text-red-500 font-semibold">⚠️ Overdue</Text>
        )}
        {!isOverdue && dueDate && (
          <Text className="text-xs text-slate-400">
            Due {dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </Text>
        )}
      </View>

      {/* Proof note (parent rejection reason) */}
      {task.parentNote && task.status === 'pending' && (
        <View className="mt-3 bg-red-50 p-2.5 rounded-xl border border-red-100">
          <Text className="text-xs text-red-700">
            💬 Parent feedback: {task.parentNote}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
