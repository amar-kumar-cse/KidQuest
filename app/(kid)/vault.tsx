import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { doc, onSnapshot, DocumentSnapshot, FirestoreError } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { claimReward } from '../../lib/firestoreService';

const REWARDS = [
  { id: '1', title: '1 Hour of Video Games', cost: 500, icon: '🎮' },
  { id: '2', title: 'Pizza Night', cost: 1200, icon: '🍕' },
  { id: '3', title: 'Movie Choice', cost: 800, icon: '🍿' },
  { id: '4', title: 'Extra Screen Time', cost: 300, icon: '📱' },
  { id: '5', title: 'Ice Cream Trip', cost: 600, icon: '🍦' },
];

export default function TheVault() {
  const router = useRouter();
  const [totalXp, setTotalXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // ── Live listener on this kid's own User document ─────────────────
  // XP updates instantly when parent approves a task (no refresh needed)
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    const userRef   = doc(db, 'Users', uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap: DocumentSnapshot) => {
        setTotalXp(snap.exists() ? (snap.data()!.totalXp || 0) : 0);
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.warn('[Vault] onSnapshot error:', err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const handleClaim = (reward: typeof REWARDS[0]) => {
    if (totalXp < reward.cost) {
      Alert.alert(
        'Not Enough XP! 😅',
        `You need ${reward.cost} XP but only have ${totalXp} XP. Keep completing quests to earn more!`,
        [{ text: 'Got it!' }]
      );
      return;
    }

    Alert.alert(
      'Claim Reward? 🎉',
      `Spend ${reward.cost} XP on "${reward.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Claim!',
          onPress: async () => {
            setClaimingId(reward.id);
            try {
              // For MVP, find the kid's UID from the listener
              // In production, use auth.currentUser?.uid
              const kidUid = auth.currentUser?.uid || '';
              const success = await claimReward(kidUid, reward.cost);
              
              if (success) {
                Alert.alert('🎉 Reward Claimed!', `You unlocked "${reward.title}"! Show this to your parent.`);
              } else {
                Alert.alert('Not Enough XP', 'You don\'t have enough XP for this reward.');
              }
            } catch (err) {
              console.error(err);
              alert('Failed to claim reward');
            } finally {
              setClaimingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-indigo-900">
      <ScrollView className="px-6 pt-10 pb-20">
        
        {/* Header */}
        <View className="flex-row justify-between items-center mb-8">
          <TouchableOpacity onPress={() => router.back()} className="bg-indigo-800 p-3 rounded-full">
            <Text className="text-white font-bold">← Back</Text>
          </TouchableOpacity>
          <Text className="text-3xl font-black text-indigo-200 tracking-wider">The Vault</Text>
          <View className="w-10" />
        </View>

        {/* Balance */}
        <View className="items-center mb-10">
          <Text className="text-8xl mb-2">💎</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#c7d2fe" className="my-4" />
          ) : (
            <>
              <Text className="text-5xl font-black text-white">{totalXp.toLocaleString()}</Text>
              <Text className="text-xl font-bold text-indigo-300 mt-1 uppercase tracking-widest">Available XP</Text>
            </>
          )}
        </View>

        {/* Claim Rewards */}
        <Text className="text-2xl font-black text-indigo-300 mb-6">Unlock Rewards</Text>
        
        <View className="flex-row flex-wrap justify-between pr-2">
          {REWARDS.map(reward => {
            const canAfford = totalXp >= reward.cost;
            const isClaiming = claimingId === reward.id;

            return (
              <TouchableOpacity 
                key={reward.id}
                activeOpacity={0.8}
                onPress={() => handleClaim(reward)}
                disabled={isClaiming}
                className={`w-full rounded-3xl p-5 mb-5 border-b-8 items-center shadow-xl ${
                  canAfford 
                    ? 'bg-indigo-800 border-indigo-950' 
                    : 'bg-indigo-950 border-indigo-950 opacity-60'
                }`}
              >
                <Text className="text-6xl mb-4">{reward.icon}</Text>
                <Text className="text-2xl font-black text-white text-center">{reward.title}</Text>
                <View className={`mt-4 py-2 px-6 rounded-full w-full items-center ${
                  canAfford ? 'bg-yellow-400' : 'bg-slate-600'
                }`}>
                  <Text className={`font-bold text-lg ${canAfford ? 'text-yellow-900' : 'text-slate-400'}`}>
                    {isClaiming ? '⏳ Claiming...' : `Claim for ${reward.cost} XP`}
                  </Text>
                </View>
                {!canAfford && (
                  <Text className="text-red-300 text-xs font-semibold mt-2">
                    Need {reward.cost - totalXp} more XP
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
