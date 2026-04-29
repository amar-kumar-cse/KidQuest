import { useState, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKidProfile } from '../../../hooks/useKidProfile';
import { taskService } from '../../../services/taskService';
import { XPBar } from '../../../components/ui/XPBar';
import { StreakBadge } from '../../../components/ui/StreakBadge';
import { TaskCard } from '../../../components/tasks/TaskCard';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { getEarnedBadges } from '../../../constants/Badges';
import type { Task } from '../../../types';

export default function KidProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile, isLoading, xpProgress, earnedBadges } = useKidProfile(id);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!id) return;
    const unsub = taskService.subscribeToKidTasks(id, (tasks) => {
      setRecentTasks(tasks.slice(0, 5));
    });
    return unsub;
  }, [id]);

  if (isLoading) return <LoadingSpinner fullScreen message="Loading profile..." />;
  if (!profile) return (
    <SafeAreaView className="flex-1 items-center justify-center">
      <Text className="text-slate-500">Kid not found.</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        <TouchableOpacity onPress={() => router.back()} className="px-6 pt-6 mb-4">
          <Text className="text-indigo-600 font-bold">← Back</Text>
        </TouchableOpacity>

        {/* Profile header */}
        <View className="bg-indigo-600 mx-6 rounded-3xl p-6 mb-6">
          <View className="flex-row items-center mb-4">
            <View className="w-16 h-16 bg-white/20 rounded-2xl items-center justify-center mr-4">
              <Text className="text-3xl">{profile.avatarEmoji ?? '👦'}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-2xl font-black text-white">{profile.name}</Text>
              {profile.age && <Text className="text-white/70 text-sm">Age {profile.age}</Text>}
            </View>
            <StreakBadge streak={profile.currentStreak ?? 0} size="sm" />
          </View>
          <XPBar current={xpProgress.current} required={xpProgress.required} level={xpProgress.level} totalXp={profile.totalXp} size="md" />
        </View>

        {/* Stats row */}
        <View className="flex-row px-6 mb-6 space-x-3">
          {[
            { label: 'Tasks Done', value: profile.tasksCompleted ?? 0, icon: '✅' },
            { label: 'Best Streak', value: `${profile.bestStreak ?? 0}d`, icon: '🔥' },
            { label: 'Rewards', value: profile.rewardsClaimed ?? 0, icon: '🎁' },
          ].map((s) => (
            <View key={s.label} className="flex-1 bg-white rounded-2xl p-3 items-center border border-slate-100 mr-2">
              <Text className="text-xl mb-1">{s.icon}</Text>
              <Text className="text-lg font-black text-slate-800">{s.value}</Text>
              <Text className="text-xs text-slate-400">{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <View className="px-6 mb-6">
            <Text className="text-base font-bold text-slate-700 mb-3">Badges Earned</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {earnedBadges.map((badge) => (
                <View key={badge.id} className="items-center mr-4">
                  <View className="w-12 h-12 rounded-2xl items-center justify-center mb-1" style={{ backgroundColor: badge.color + '22' }}>
                    <Text className="text-2xl">{badge.icon}</Text>
                  </View>
                  <Text className="text-xs text-slate-500 text-center" numberOfLines={2} style={{ maxWidth: 56 }}>{badge.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent tasks */}
        <View className="px-6">
          <Text className="text-base font-bold text-slate-700 mb-3">Recent Tasks</Text>
          {recentTasks.map((task) => (
            <TaskCard key={task.id} task={task} onPress={() => router.push(`/(parent)/tasks/${task.id}` as any)} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
