import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import AiMotivator from '../../components/AiMotivator';

interface StreakData {
  current: number;
  best: number;
  todayDone: number;
  todayTotal: number;
}

export default function KidStatsScreen() {
  const router = useRouter();
  const [totalXp, setTotalXp] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [loading, setLoading] = useState(true);

  // Streak data (mock for MVP — would need daily tracking in Firestore for production)
  const [streak, setStreak] = useState<StreakData>({ current: 3, best: 7, todayDone: 2, todayTotal: 5 });

  // Listen for completed tasks to get XP
  useEffect(() => {
    const q = query(
      collection(db, 'Tasks'),
      where('assignedTo', '==', 'Alex'),
      where('status', '==', 'completed')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      let xp = 0;
      let count = 0;
      snap.forEach((d) => {
        xp += d.data().xp || 0;
        count++;
      });
      setTotalXp(xp);
      setCompletedTasks(count);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Also listen to kid's user profile for XP
  useEffect(() => {
    const q = query(collection(db, 'Users'), where('role', '==', 'kid'));
    const unsubscribe = onSnapshot(q, (snap) => {
      let xp = 0;
      snap.forEach((d) => {
        xp += d.data().totalXp || 0;
      });
      if (xp > 0) setTotalXp(xp);
    });
    return () => unsubscribe();
  }, []);

  // Calculate level from XP
  const level = Math.floor(totalXp / 500) + 1;
  const xpForNextLevel = level * 500;
  const xpInCurrentLevel = totalXp - (level - 1) * 500;
  const levelProgress = (xpInCurrentLevel / 500) * 100;

  const LEVEL_TITLES = ['Novice', 'Scout', 'Explorer', 'Adventurer', 'Champion', 'Hero', 'Legend', 'Master', 'Grandmaster'];
  const levelTitle = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];

  return (
    <SafeAreaView className="flex-1 bg-[#E1F1F8]">
      <ScrollView className="px-6 pt-8 pb-20">

        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Text className="text-[#000080] font-bold text-lg">← Back</Text>
          </TouchableOpacity>
          <Text className="text-xl font-black text-[#000080]">My Stats</Text>
          <View className="w-16" />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#000080" className="mt-20" />
        ) : (
          <>
            {/* Level Card */}
            <View className="bg-[#000080] rounded-3xl p-6 mb-6 items-center border-b-8 border-indigo-900 shadow-xl">
              <Text className="text-6xl mb-2">🏅</Text>
              <Text className="text-indigo-300 font-bold text-lg uppercase tracking-widest">{levelTitle}</Text>
              <Text className="text-5xl font-black text-white mt-1">Level {level}</Text>
              <View className="w-full mt-4">
                <View className="h-4 bg-indigo-800 rounded-full overflow-hidden">
                  <View className="h-full bg-[#FFD700] rounded-full" style={{ width: `${levelProgress}%` }} />
                </View>
                <View className="flex-row justify-between mt-2">
                  <Text className="text-indigo-300 font-bold text-sm">{xpInCurrentLevel} XP</Text>
                  <Text className="text-indigo-300 font-bold text-sm">{xpForNextLevel} XP</Text>
                </View>
              </View>
            </View>

            {/* Stats Grid */}
            <View className="flex-row mb-4">
              <View className="flex-1 bg-white p-5 rounded-2xl shadow-sm border border-sky-100 mr-2 items-center">
                <Text className="text-4xl mb-1">💎</Text>
                <Text className="text-2xl font-black text-[#000080]">{totalXp.toLocaleString()}</Text>
                <Text className="text-xs font-bold text-sky-600 mt-1">Total XP</Text>
              </View>
              <View className="flex-1 bg-white p-5 rounded-2xl shadow-sm border border-sky-100 ml-2 items-center">
                <Text className="text-4xl mb-1">✅</Text>
                <Text className="text-2xl font-black text-[#000080]">{completedTasks}</Text>
                <Text className="text-xs font-bold text-sky-600 mt-1">Quests Done</Text>
              </View>
            </View>

            {/* AI Motivator Card */}
            <View className="-mx-4 mb-2">
              <AiMotivator kidXp={totalXp} />
            </View>

            {/* Streak Card */}
            <View className="bg-white rounded-2xl p-5 shadow-sm border border-sky-100 mb-6">
              <Text className="text-lg font-black text-[#000080] mb-4">🔥 Streak Tracker</Text>
              <View className="flex-row justify-between">
                <View className="items-center flex-1">
                  <Text className="text-3xl font-black text-orange-500">{streak.current}</Text>
                  <Text className="text-xs font-bold text-slate-500 mt-1">Current</Text>
                </View>
                <View className="w-px bg-slate-200" />
                <View className="items-center flex-1">
                  <Text className="text-3xl font-black text-amber-500">{streak.best}</Text>
                  <Text className="text-xs font-bold text-slate-500 mt-1">Best</Text>
                </View>
                <View className="w-px bg-slate-200" />
                <View className="items-center flex-1">
                  <Text className="text-3xl font-black text-green-500">{streak.todayDone}/{streak.todayTotal}</Text>
                  <Text className="text-xs font-bold text-slate-500 mt-1">Today</Text>
                </View>
              </View>
            </View>

            {/* Badges / Achievements */}
            <Text className="text-lg font-black text-[#000080] mb-4">🏆 Badges</Text>
            <View className="flex-row flex-wrap mb-6">
              {[
                { icon: '🌟', name: 'First Quest', unlocked: completedTasks >= 1 },
                { icon: '⚡', name: '5 Quests Done', unlocked: completedTasks >= 5 },
                { icon: '🔥', name: '3-Day Streak', unlocked: streak.current >= 3 },
                { icon: '💎', name: '1000 XP Club', unlocked: totalXp >= 1000 },
                { icon: '🦸', name: 'Focus Hero', unlocked: false },
                { icon: '👑', name: 'Level 5', unlocked: level >= 5 },
              ].map((badge, i) => (
                <View key={i} className={`w-[30%] m-[1.5%] p-4 rounded-2xl items-center ${badge.unlocked ? 'bg-white border border-[#FFD700] shadow-sm' : 'bg-slate-100 opacity-40'}`}>
                  <Text className="text-4xl mb-2">{badge.icon}</Text>
                  <Text className={`text-xs font-bold text-center ${badge.unlocked ? 'text-[#000080]' : 'text-slate-400'}`}>
                    {badge.name}
                  </Text>
                  {!badge.unlocked && <Text className="text-[8px] text-slate-400 mt-1">🔒 Locked</Text>}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
