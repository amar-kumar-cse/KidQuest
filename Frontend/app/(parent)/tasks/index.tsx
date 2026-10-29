import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList, SafeAreaView, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../../lib/firebase';
import { taskService } from '../../../services/taskService';
import { TaskCard } from '../../../components/tasks/TaskCard';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { Task } from '../../../types';

type FilterType = 'all' | 'pending' | 'pending_approval' | 'completed';

const FILTERS: { key: FilterType; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '📋' },
  { key: 'pending', label: 'To Do', emoji: '⏳' },
  { key: 'pending_approval', label: 'Review', emoji: '🔔' },
  { key: 'completed', label: 'Done', emoji: '✅' },
];

export default function ParentTasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  const parentId = auth.currentUser?.uid;

  useEffect(() => {
    if (!parentId) return;

    const unsubscribe = taskService.subscribeToParentTasks(parentId, (allTasks) => {
      setTasks(allTasks);
      setLoading(false);
    });
    return unsubscribe;
  }, [parentId]);

  const filtered = useMemo(() => {
    return filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);
  }, [filter, tasks]);

  const renderTaskItem = useCallback(({ item }: { item: Task }) => (
    <TaskCard
      task={item}
      showKidName
      onPress={() => router.push(`/(parent)/tasks/${item.id}` as any)}
    />
  ), [router]);

  const keyExtractor = useCallback((item: Task) => item.id, []);

  const ListHeader = useMemo(() => (
    <View className="pt-8 pb-4">
      {/* Header */}
      <Text className="text-3xl font-extrabold text-slate-800">All Tasks</Text>
      <Text className="text-slate-400 mt-1 mb-4">{tasks.length} tasks total</Text>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
        <View className="flex-row">
          {FILTERS.map((f) => {
            const count = f.key === 'all' ? tasks.length : tasks.filter((t) => t.status === f.key).length;
            const isSelected = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                className={`flex-row items-center px-4 py-2 rounded-full border mr-2 ${
                  isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'
                }`}
              >
                <Text className="mr-1">{f.emoji}</Text>
                <Text className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                  {f.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  ), [filter, tasks]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <LoadingSpinner message="Loading tasks..." />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderTaskItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            <EmptyState
              icon="📭"
              title="No tasks here"
              message="Assign tasks to your kids from the dashboard."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
