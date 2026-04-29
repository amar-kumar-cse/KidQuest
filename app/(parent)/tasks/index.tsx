import { useState, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { taskService } from '../../../services/taskService';
import { userService } from '../../../services/userService';
import { TaskCard } from '../../../components/tasks/TaskCard';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { Task } from '../../../types';
import type { Kid } from '../../../types';

type FilterType = 'all' | 'pending' | 'pending_approval' | 'completed';

export default function ParentTasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [kidMap, setKidMap] = useState<Record<string, string>>({});

  const parentId = auth.currentUser?.uid;

  useEffect(() => {
    if (!parentId) return;

    const unsubscribe = taskService.subscribeToParentTasks(parentId, (allTasks) => {
      setTasks(allTasks);
      setLoading(false);
    });
    return unsubscribe;
  }, [parentId]);

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

  const FILTERS: { key: FilterType; label: string; emoji: string }[] = [
    { key: 'all', label: 'All', emoji: '📋' },
    { key: 'pending', label: 'To Do', emoji: '⏳' },
    { key: 'pending_approval', label: 'Review', emoji: '🔔' },
    { key: 'completed', label: 'Done', emoji: '✅' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="px-6 pt-8 pb-4">
          <Text className="text-3xl font-extrabold text-slate-800">All Tasks</Text>
          <Text className="text-slate-400 mt-1">{tasks.length} tasks total</Text>
        </View>

        {/* Filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6 mb-4">
          <View className="flex-row space-x-2">
            {FILTERS.map((f) => {
              const count = f.key === 'all' ? tasks.length : tasks.filter((t) => t.status === f.key).length;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  className={`flex-row items-center px-4 py-2 rounded-full border mr-2 ${
                    filter === f.key
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Text className="mr-1">{f.emoji}</Text>
                  <Text className={`font-semibold text-sm ${filter === f.key ? 'text-white' : 'text-slate-600'}`}>
                    {f.label} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Tasks */}
        <View className="px-6">
          {loading ? (
            <LoadingSpinner message="Loading tasks..." />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="📭"
              title="No tasks here"
              message="Assign tasks to your kids from the dashboard."
            />
          ) : (
            filtered.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                showKidName
                onPress={() => router.push(`/(parent)/tasks/${task.id}` as any)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => router.push('/(parent)/create-task')}
        className="absolute bottom-8 right-6 bg-indigo-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
      >
        <Text className="text-white text-2xl font-bold">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
