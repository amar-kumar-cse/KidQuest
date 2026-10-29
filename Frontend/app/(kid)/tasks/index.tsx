import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList, SafeAreaView, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../../lib/firebase';
import { taskService } from '../../../services/taskService';
import { TaskCard } from '../../../components/tasks/TaskCard';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { Task } from '../../../types';

type Filter = 'pending' | 'pending_approval' | 'completed';

const FILTERS: { key: Filter; label: string; emoji: string }[] = [
  { key: 'pending', label: 'To Do', emoji: '📋' },
  { key: 'pending_approval', label: 'Submitted', emoji: '⏳' },
  { key: 'completed', label: 'Done', emoji: '✅' },
];

export default function KidTasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const kidId = auth.currentUser?.uid;

  useEffect(() => {
    if (!kidId) return;
    const unsub = taskService.subscribeToKidTasks(kidId, (t) => {
      setTasks(t);
      setLoading(false);
    });
    return unsub;
  }, [kidId]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => t.status === filter);
  }, [tasks, filter]);

  const renderTaskItem = useCallback(({ item }: { item: Task }) => (
    <TaskCard
      task={item}
      onPress={() => router.push(`/(kid)/tasks/${item.id}` as any)}
    />
  ), [router]);

  const keyExtractor = useCallback((item: Task) => item.id, []);

  const ListHeader = useMemo(() => (
    <View className="pt-8 pb-4">
      <Text className="text-3xl font-black text-yellow-900 mb-4">My Quests 🗺️</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
        <View className="flex-row">
          {FILTERS.map((f) => {
            const count = tasks.filter((t) => t.status === f.key).length;
            const isSelected = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                className={`flex-row items-center px-4 py-2 rounded-full border mr-2 ${
                  isSelected ? 'bg-yellow-400 border-yellow-500' : 'bg-white border-slate-200'
                }`}
              >
                <Text className="mr-1">{f.emoji}</Text>
                <Text
                  className={`font-bold text-sm ${
                    isSelected ? 'text-yellow-900' : 'text-slate-600'
                  }`}
                >
                  {f.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  ), [tasks, filter]);

  return (
    <SafeAreaView className="flex-1 bg-amber-50">
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <LoadingSpinner message="Loading quests..." />
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
              icon={filter === 'pending' ? '🎉' : '📭'}
              title={filter === 'pending' ? 'All caught up!' : 'Nothing here yet'}
              message={
                filter === 'pending'
                  ? 'No tasks waiting — you are amazing!'
                  : 'Complete a task to see it here.'
              }
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
