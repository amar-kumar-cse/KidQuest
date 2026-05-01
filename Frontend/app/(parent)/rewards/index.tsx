import { useState, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { rewardService } from '../../../services/rewardService';
import { RewardCard } from '../../../components/rewards/RewardCard';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { Reward } from '../../../types';

export default function ParentRewardsScreen() {
  const router = useRouter();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  const parentId = auth.currentUser?.uid;

  useEffect(() => {
    if (!parentId) return;
    const unsubscribe = rewardService.subscribeToParentRewards(parentId, (r) => {
      setRewards(r);
      setLoading(false);
    });
    return unsubscribe;
  }, [parentId]);

  const handleToggle = async (reward: Reward) => {
    try {
      await rewardService.toggleReward(reward.id, !reward.isActive);
    } catch {
      Alert.alert('Error', 'Could not update reward.');
    }
  };

  const handleDelete = (reward: Reward) => {
    Alert.alert(
      'Delete Reward',
      `Are you sure you want to delete "${reward.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try { await rewardService.deleteReward(reward.id); }
            catch { Alert.alert('Error', 'Could not delete reward.'); }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="px-6 pt-8 pb-4">
          <Text className="text-3xl font-extrabold text-slate-800">Rewards</Text>
          <Text className="text-slate-400 mt-1">Kids redeem XP for these</Text>
        </View>

        <View className="px-6">
          {loading ? (
            <LoadingSpinner message="Loading rewards..." />
          ) : rewards.length === 0 ? (
            <EmptyState
              icon="🎁"
              title="No Rewards Yet"
              message="Create rewards that your kids can redeem with their XP!"
            />
          ) : (
            rewards.map((reward) => (
              <View key={reward.id} className="mb-3">
                <RewardCard
                  reward={reward}
                  mode="parent"
                  onEdit={() => handleToggle(reward)}
                />
                <View className="flex-row justify-end mt-2 space-x-2">
                  <TouchableOpacity
                    onPress={() => handleToggle(reward)}
                    className={`px-3 py-1.5 rounded-lg ${reward.isActive ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}
                  >
                    <Text className={`text-xs font-bold ${reward.isActive ? 'text-amber-700' : 'text-green-700'}`}>
                      {reward.isActive ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(reward)}
                    className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200"
                  >
                    <Text className="text-xs font-bold text-red-600">Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        onPress={() => router.push('/(parent)/rewards/create' as any)}
        className="absolute bottom-8 right-6 bg-indigo-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
      >
        <Text className="text-white text-2xl font-bold">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
