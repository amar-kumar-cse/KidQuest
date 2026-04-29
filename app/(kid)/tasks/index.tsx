import { useState, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../../lib/firebase';
import { taskService } from '../../../services/taskService';
import { TaskCard } from '../../../components/tasks/TaskCard';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { Task } from '../../../types';

type Filter = 'pending' | 'pending_approval' | 'completed';

export default function KidTasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const kidId = auth.currentUser?.uid;

  useEffect(() => {
    if (!kidId) return;
    const unsub = taskService.subscribeToKidTasks(kidId, (t) => { setTasks(t); setLoading(false); });
    return unsub;
  }, [kidId]);

  const filtered = tasks.filter((t) => t.status === filter);
  const FILTERS: { key: Filter; label: string; emoji: string }[] = [
    { key: 'pending', label: 'To Do', emoji: '📋' },
    { key: 'pending_approval', label: 'Submitted', emoji: '⏳' },
    { key: 'completed', label: 'Done', emoji: '✅' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-amber-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="px-6 pt-8 pb-4">
          <Text className="text-3xl font-black text-yellow-900">My Quests 🗺️</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6 mb-4">
          <View className="flex-row">
            {FILTERS.map((f) => {
              const count = tasks.filter((t) => t.status === f.key).length;
              return (
                <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)}
                  className={`flex-row items-center px-4 py-2 rounded-full border mr-2 ${filter === f.key ? 'bg-yellow-400 border-yellow-500' : 'bg-white border-slate-200'}`}>
                  <Text className="mr-1">{f.emoji}</Text>
                  <Text className={`font-bold text-sm ${filter === f.key ? 'text-yellow-900' : 'text-slate-600'}`}>{f.label} ({count})</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        <View className="px-6">
          {loading ? <LoadingSpinner message="Loading quests..." /> :
            filtered.length === 0 ? (
              <EmptyState icon={filter === 'pending' ? '🎉' : '📭'} title={filter === 'pending' ? 'All caught up!' : 'Nothing here yet'} message={filter === 'pending' ? 'No tasks waiting — you are amazing!' : 'Complete a task to see it here.'} />
            ) : filtered.map((task) => (
              <TaskCard key={task.id} task={task} onPress={() => router.push(`/(kid)/tasks/${task.id}` as any)} />
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
