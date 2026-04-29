import { useState, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, Alert, TouchableOpacity } from 'react-native';
import { auth } from '../../../lib/firebase';
import { rewardService } from '../../../services/rewardService';
import { userService } from '../../../services/userService';
import { RewardCard } from '../../../components/rewards/RewardCard';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { Reward } from '../../../types';

export default function KidRewardsScreen() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [currentXp, setCurrentXp] = useState(0);
  const [linkedParentId, setLinkedParentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const kidId = auth.currentUser?.uid;

  useEffect(() => {
    const load = async () => {
      if (!kidId) return;
      const profile = await userService.getUserProfile(kidId);
      if (profile?.role === 'kid') {
        setCurrentXp(profile.totalXp ?? 0);
        setLinkedParentId(profile.linkedParentId ?? null);
      }
    };
    load();
  }, [kidId]);

  useEffect(() => {
    if (!linkedParentId) { setLoading(false); return; }
    const unsub = rewardService.subscribeToKidRewards(linkedParentId, (r) => { setRewards(r); setLoading(false); });
    return unsub;
  }, [linkedParentId]);

  const handleClaim = async (reward: Reward) => {
    if (currentXp < reward.xpCost) { Alert.alert('Not Enough XP', `You need ${reward.xpCost} XP but have ${currentXp}.`); return; }
    Alert.alert('Claim Reward?', `Spend ${reward.xpCost} XP for "${reward.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Claim 🎁', onPress: async () => {
        setClaiming(reward.id);
        try {
          await rewardService.claimReward(reward.id);
          setCurrentXp((x) => x - reward.xpCost);
          Alert.alert('🎉 Claimed!', `"${reward.title}" claimed! Tell your parent to deliver it.`);
        } catch (err: any) {
          Alert.alert('Error', err.message ?? 'Could not claim reward.');
        } finally { setClaiming(null); }
      }},
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-amber-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        <View className="px-6 pt-8 pb-2">
          <Text className="text-3xl font-black text-yellow-900">Rewards Shop 🛍️</Text>
          <View className="flex-row items-center mt-2 bg-yellow-400 self-start px-4 py-2 rounded-full">
            <Text className="text-yellow-900 font-black">⭐ {currentXp.toLocaleString()} XP available</Text>
          </View>
        </View>

        <View className="px-6 mt-4">
          {loading ? <LoadingSpinner message="Loading rewards..." /> :
            !linkedParentId ? (
              <EmptyState icon="🔗" title="Not Linked Yet" message="Enter your family code in settings to see rewards." />
            ) : rewards.length === 0 ? (
              <EmptyState icon="🎁" title="No Rewards Yet" message="Ask your parent to add some rewards!" />
            ) : (
              rewards.map((reward) => (
                <View key={reward.id} className="mb-3">
                  <RewardCard reward={reward} currentXp={currentXp} mode="kid" onClaim={() => handleClaim(reward)} isClaiming={claiming === reward.id} />
                </View>
              ))
            )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
