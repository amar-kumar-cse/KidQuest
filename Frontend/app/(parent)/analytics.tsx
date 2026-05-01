import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Ionicons } from '@expo/vector-icons';

interface DayStats {
  day: string;
  completed: number;
  total: number;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [totalXpEarned, setTotalXpEarned] = useState(0);
  const [weeklyData, setWeeklyData] = useState<DayStats[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const parentId = auth.currentUser?.uid || 'anonymous';

    try {
      // Get all tasks for this parent
      const allTasksQuery = query(
        collection(db, 'Tasks'),
        where('parentId', '==', parentId)
      );
      const allSnap = await getDocs(allTasksQuery);

      let completed = 0;
      let pending = 0;
      let xpEarned = 0;

      allSnap.forEach((d) => {
        const data = d.data();
        if (data.status === 'completed') {
          completed++;
          xpEarned += data.xp || 0;
        } else {
          pending++;
        }
      });

      setTotalCompleted(completed);
      setTotalPending(pending);
      setTotalXpEarned(xpEarned);

      // Generate mock weekly data based on real counts
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const today = new Date().getDay(); // 0 = Sunday
      const mapped = days.map((day, i) => {
        const dayIndex = i + 1; // Mon=1 ... Sun=7
        if (dayIndex <= today || today === 0) {
          // Past or current day: use some distribution of real data
          const share = Math.max(1, Math.floor(Math.random() * 4));
          return { day, completed: Math.min(share, completed), total: share + Math.floor(Math.random() * 2) };
        }
        return { day, completed: 0, total: 0 };
      });
      setWeeklyData(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const completionRate = totalCompleted + totalPending > 0
    ? Math.round((totalCompleted / (totalCompleted + totalPending)) * 100)
    : 0;

  const maxBar = Math.max(...weeklyData.map(d => d.total), 1);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="px-6 pt-8 pb-20">

        {/* Header */}
        <View className="flex-row items-center justify-between mb-8">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#4f46e5" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-800">Analytics</Text>
          <View className="w-8" />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#4f46e5" className="mt-20" />
        ) : (
          <>
            {/* Summary Cards */}
            <View className="flex-row mb-6">
              <View className="flex-1 bg-green-50 p-5 rounded-2xl mr-2 border border-green-100">
                <Text className="text-green-800 font-semibold text-sm">Completed</Text>
                <Text className="text-4xl font-black text-green-600 mt-1">{totalCompleted}</Text>
              </View>
              <View className="flex-1 bg-amber-50 p-5 rounded-2xl ml-2 border border-amber-100">
                <Text className="text-amber-800 font-semibold text-sm">Pending</Text>
                <Text className="text-4xl font-black text-amber-600 mt-1">{totalPending}</Text>
              </View>
            </View>

            {/* XP & Completion Rate */}
            <View className="flex-row mb-8">
              <View className="flex-1 bg-indigo-600 p-5 rounded-2xl mr-2">
                <Text className="text-indigo-200 font-semibold text-sm">Total XP Earned</Text>
                <Text className="text-3xl font-black text-white mt-1">{totalXpEarned.toLocaleString()}</Text>
              </View>
              <View className="flex-1 bg-white p-5 rounded-2xl ml-2 border border-slate-100 shadow-sm">
                <Text className="text-slate-500 font-semibold text-sm">Completion Rate</Text>
                <Text className="text-3xl font-black text-slate-800 mt-1">{completionRate}%</Text>
                {/* Mini progress bar */}
                <View className="h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
                  <View className="h-full bg-green-500 rounded-full" style={{ width: `${completionRate}%` }} />
                </View>
              </View>
            </View>

            {/* Weekly Chart */}
            <Text className="text-lg font-bold text-slate-800 mb-4">Weekly Activity</Text>
            <View className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
              <View className="flex-row items-end justify-between" style={{ height: 140 }}>
                {weeklyData.map((d, i) => {
                  const barHeight = d.total > 0 ? (d.total / maxBar) * 120 : 4;
                  const fillHeight = d.completed > 0 ? (d.completed / maxBar) * 120 : 0;
                  return (
                    <View key={d.day} className="flex-1 items-center">
                      {/* Bar background */}
                      <View className="w-6 bg-slate-100 rounded-full overflow-hidden" style={{ height: barHeight }}>
                        {/* Fill */}
                        <View className="w-full bg-indigo-500 rounded-full absolute bottom-0" style={{ height: fillHeight }} />
                      </View>
                      <Text className="text-xs font-bold text-slate-400 mt-2">{d.day}</Text>
                    </View>
                  );
                })}
              </View>
              <View className="flex-row mt-4 items-center justify-center space-x-4">
                <View className="flex-row items-center mr-4">
                  <View className="w-3 h-3 rounded-full bg-indigo-500 mr-1" />
                  <Text className="text-xs text-slate-500 font-semibold">Completed</Text>
                </View>
                <View className="flex-row items-center">
                  <View className="w-3 h-3 rounded-full bg-slate-100 mr-1" />
                  <Text className="text-xs text-slate-500 font-semibold">Assigned</Text>
                </View>
              </View>
            </View>

            {/* Insight Card */}
            <View className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="bulb-outline" size={20} color="#4f46e5" />
                <Text className="text-indigo-700 font-bold text-base ml-2">Insight</Text>
              </View>
              <Text className="text-indigo-600 font-medium leading-5">
                {completionRate >= 80
                  ? "Amazing progress! Your kid is crushing it this week. Keep the momentum going! 🚀"
                  : completionRate >= 50
                    ? "Good effort! Try breaking tasks into smaller quests to boost completion rates."
                    : "Tip: Start with fun, short tasks early in the day to build momentum."}
              </Text>
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
