import { useState, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, Modal, Image, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKidProfile } from '../../../hooks/useKidProfile';
import { taskService } from '../../../services/taskService';
import { XPBar } from '../../../components/ui/XPBar';
import { StreakBadge } from '../../../components/ui/StreakBadge';
import { TaskCard } from '../../../components/tasks/TaskCard';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { getEarnedBadges } from '../../../constants/Badges';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../lib/firebase';
import type { Task } from '../../../types';

export default function KidProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile, isLoading, xpProgress, earnedBadges } = useKidProfile(id);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = taskService.subscribeToKidTasks(id, (tasks) => {
      setRecentTasks(tasks.slice(0, 5));
    });
    return unsub;
  }, [id]);

  const handleGenerateQr = async () => {
    if (!id) return;
    setGeneratingQr(true);
    try {
      const getQrToken = httpsCallable<{ kidUid: string }, { success: boolean; customToken: string }>(functions, 'generateKidCustomToken');
      const result = await getQrToken({ kidUid: id });
      if (result.data.success && result.data.customToken) {
        setQrToken(result.data.customToken);
        setQrModalVisible(true);
      } else {
        Alert.alert('Error', 'Could not generate linking code.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Linking failed.');
    } finally {
      setGeneratingQr(false);
    }
  };

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
              <View className="flex-row items-center mt-1">
                {profile.age && <Text className="text-white/70 text-sm mr-3">Age {profile.age}</Text>}
                <TouchableOpacity 
                  onPress={handleGenerateQr}
                  disabled={generatingQr}
                  className="bg-white/20 px-2 py-1 rounded-lg flex-row items-center"
                >
                  {generatingQr ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white text-xs font-bold">📱 Link Device (QR)</Text>
                  )}
                </TouchableOpacity>
              </View>
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

        {/* Health Points (HP) Bar */}
        <View className="bg-white mx-6 rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-base font-bold text-slate-700">💚 Health Points (HP)</Text>
            <Text className="text-base font-bold text-green-600">{(profile as any).hp !== undefined ? (profile as any).hp : 100}/100</Text>
          </View>
          <View className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <View 
              className="h-full bg-green-500 rounded-full" 
              style={{ width: `${(profile as any).hp !== undefined ? (profile as any).hp : 100}%` }} 
            />
          </View>
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

      {/* QR Code Linking Modal */}
      <Modal
        visible={qrModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View className="flex-1 bg-slate-900/80 items-center justify-center p-6">
          <View className="bg-white rounded-3xl p-6 items-center w-full max-w-sm">
            <Text className="text-2xl font-black text-slate-800 mb-2">Link Kid's Device</Text>
            <Text className="text-slate-500 text-center mb-6">
              Ask your child to tap "Scan to Start" on their welcome screen and scan this code.
            </Text>

            {qrToken && (
              <View className="p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm mb-6">
                <Image
                  source={{ uri: `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(qrToken)}` }}
                  className="w-56 h-56"
                  resizeMode="contain"
                />
              </View>
            )}

            <TouchableOpacity
              onPress={() => setQrModalVisible(false)}
              className="bg-indigo-600 w-full py-4 rounded-2xl items-center shadow-md"
            >
              <Text className="text-white font-bold text-lg">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

