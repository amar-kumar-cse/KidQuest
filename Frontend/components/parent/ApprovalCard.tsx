import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { getCategoryDef } from '../../constants/TaskCategories';
import type { Task } from '../../types';

interface ApprovalCardProps {
  task: Task;
  onApprove: () => void;
  onReject: () => void;
  isActioning?: boolean;
}

export function ApprovalCard({
  task,
  onApprove,
  onReject,
  isActioning = false,
}: ApprovalCardProps) {
  const catDef = getCategoryDef(task.category);
  const submittedAt = task.completedAt?.toDate?.() ?? null;

  return (
    <View className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm mb-3">
      {/* Header */}
      <View className="flex-row items-center mb-3">
        <View
          className="w-10 h-10 rounded-xl items-center justify-center mr-3"
          style={{ backgroundColor: catDef.bg }}
        >
          <Text className="text-lg">{catDef.icon}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-800">{task.title}</Text>
          <Text className="text-xs text-slate-400">
            {task.assignedToName ?? task.assignedTo} •{' '}
            {submittedAt
              ? submittedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Just now'}
          </Text>
        </View>
        <Text className="text-indigo-600 font-black text-base">+{task.xp} XP</Text>
      </View>

      {/* Description */}
      {task.description && (
        <Text className="text-sm text-slate-500 mb-3 leading-5">{task.description}</Text>
      )}

      {/* Proof link */}
      {task.proofUrl ? (
        <TouchableOpacity
          onPress={() => Linking.openURL(task.proofUrl!)}
          className="bg-sky-50 p-3 rounded-xl border border-sky-100 flex-row items-center mb-3"
        >
          <Text className="mr-2">🔗</Text>
          <Text className="text-sky-700 font-semibold text-sm flex-1">
            View Photo Proof
          </Text>
          <Text className="text-sky-400">→</Text>
        </TouchableOpacity>
      ) : (
        <View className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex-row items-center mb-3">
          <Text className="mr-2">⚠️</Text>
          <Text className="text-amber-700 font-medium text-sm">No photo proof submitted</Text>
        </View>
      )}

      {/* Kid's proof note */}
      {task.proofNote && (
        <View className="bg-slate-50 p-3 rounded-xl mb-3">
          <Text className="text-xs text-slate-500 italic">"{task.proofNote}"</Text>
        </View>
      )}

      {/* Approve / Reject buttons */}
      <View className="flex-row space-x-3">
        <TouchableOpacity
          onPress={onReject}
          disabled={isActioning}
          className="flex-1 bg-red-50 border border-red-200 py-3 rounded-xl items-center"
        >
          <Text className="text-red-600 font-bold">
            {isActioning ? '...' : '✗  Reject'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onApprove}
          disabled={isActioning}
          className="flex-1 bg-green-500 py-3 rounded-xl items-center shadow-sm"
        >
          <Text className="text-white font-black">
            {isActioning ? '...' : '✓  Approve'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
