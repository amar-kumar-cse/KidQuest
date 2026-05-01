import { View, Text, ScrollView, SafeAreaView } from 'react-native';
import { auth } from '../../lib/firebase';
import { useKidProfile } from '../../hooks/useKidProfile';
import { XPBar } from '../../components/ui/XPBar';
import { StreakBadge } from '../../components/ui/StreakBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { BADGES } from '../../constants/Badges';

export default function AchievementsScreen() {
  const kidId = auth.currentUser?.uid;
  const { profile, isLoading, earnedBadges, xpProgress } = useKidProfile(kidId);

  if (isLoading) return <LoadingSpinner fullScreen />;

  const earnedIds = new Set(earnedBadges.map((b) => b.id));

  return (
    <SafeAreaView className="flex-1 bg-amber-50">
      <ScrollView className="flex-1 px-6 pt-8" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="text-3xl font-black text-yellow-900 mb-2">Achievements 🏅</Text>

        {/* XP / Level */}
        {profile && (
          <View className="bg-indigo-600 rounded-3xl p-5 mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-indigo-200 text-sm">Total XP</Text>
                <Text className="text-white font-black text-3xl">{(profile.totalXp ?? 0).toLocaleString()}</Text>
              </View>
              <StreakBadge streak={profile.currentStreak ?? 0} size="md" />
            </View>
            <XPBar current={xpProgress.current} required={xpProgress.required} level={xpProgress.level} size="md" />
          </View>
        )}

        {/* Stats */}
        {profile && (
          <View className="flex-row mb-6 space-x-3">
            {[
              { label: 'Tasks Done', value: profile.tasksCompleted ?? 0 },
              { label: 'Best Streak', value: `${profile.bestStreak ?? 0}d` },
              { label: 'Rewards', value: profile.rewardsClaimed ?? 0 },
            ].map((s) => (
              <View key={s.label} className="flex-1 bg-white rounded-2xl p-4 items-center border border-slate-100 mr-2">
                <Text className="text-xl font-black text-slate-800">{s.value}</Text>
                <Text className="text-xs text-slate-400 mt-1">{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Badges grid */}
        <Text className="text-base font-bold text-slate-700 mb-3">All Badges</Text>
        <View className="flex-row flex-wrap">
          {BADGES.map((badge) => {
            const earned = earnedIds.has(badge.id);
            return (
              <View key={badge.id} className={`w-1/3 items-center p-3 mb-4 ${!earned ? 'opacity-40' : ''}`}>
                <View className="w-16 h-16 rounded-2xl items-center justify-center mb-2" style={{ backgroundColor: badge.color + '22' }}>
                  <Text className="text-3xl">{badge.icon}</Text>
                </View>
                <Text className="text-xs font-bold text-slate-700 text-center">{badge.name}</Text>
                <Text className="text-xs text-slate-400 text-center mt-0.5" numberOfLines={2}>{badge.description}</Text>
                {earned && <Text className="text-xs text-green-600 font-bold mt-1">Earned ✓</Text>}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
