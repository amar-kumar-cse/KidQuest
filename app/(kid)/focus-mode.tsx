import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Switch, ScrollView, Alert, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FOCUS_MODE_KEY = '@kidquest_focus_mode';
const FOCUS_START_KEY = '@kidquest_focus_start';

interface FocusModeSettings {
  enabled: boolean;
  startedAt: string | null;
  duration: number; // minutes
}

export default function FocusModeScreen() {
  const router = useRouter();
  const [focusEnabled, setFocusEnabled] = useState(false);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(30); // default 30 min
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

  useEffect(() => {
    loadFocusState();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (focusEnabled) {
      timerRef.current = setInterval(() => {
        setElapsedMinutes(prev => {
          const next = prev + 1;
          if (next >= selectedDuration) {
            endFocusSession();
            return 0;
          }
          return next;
        });
      }, 60000); // every minute
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [focusEnabled, selectedDuration]);

  const loadFocusState = async () => {
    try {
      const stored = await AsyncStorage.getItem(FOCUS_MODE_KEY);
      if (stored) {
        const settings: FocusModeSettings = JSON.parse(stored);
        if (settings.enabled && settings.startedAt) {
          const started = new Date(settings.startedAt);
          const now = new Date();
          const minutesPassed = Math.floor((now.getTime() - started.getTime()) / 60000);

          if (minutesPassed < settings.duration) {
            setFocusEnabled(true);
            setElapsedMinutes(minutesPassed);
            setSelectedDuration(settings.duration);
          } else {
            // Focus time expired
            await endFocusSession();
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startFocusSession = async () => {
    const settings: FocusModeSettings = {
      enabled: true,
      startedAt: new Date().toISOString(),
      duration: selectedDuration,
    };
    await AsyncStorage.setItem(FOCUS_MODE_KEY, JSON.stringify(settings));
    setFocusEnabled(true);
    setElapsedMinutes(0);
  };

  const endFocusSession = async () => {
    const settings: FocusModeSettings = { enabled: false, startedAt: null, duration: selectedDuration };
    await AsyncStorage.setItem(FOCUS_MODE_KEY, JSON.stringify(settings));
    setFocusEnabled(false);
    setElapsedMinutes(0);
    if (timerRef.current) clearInterval(timerRef.current);
    Alert.alert('🎯 Focus Ended!', 'Great job staying focused! You can now use other apps.');
  };

  const toggleFocus = () => {
    if (focusEnabled) {
      Alert.alert(
        'End Focus Session?',
        'Are you sure you want to end your focus session early?',
        [
          { text: 'Keep Going!', style: 'cancel' },
          { text: 'End Session', style: 'destructive', onPress: endFocusSession },
        ]
      );
    } else {
      startFocusSession();
    }
  };

  const remaining = selectedDuration - elapsedMinutes;
  const progressPercent = selectedDuration > 0 ? (elapsedMinutes / selectedDuration) * 100 : 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <ScrollView className="px-6 pt-8 pb-20">

        {/* Header */}
        <View className="flex-row items-center justify-between mb-8">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Text className="text-indigo-400 font-bold text-lg">← Back</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white">Focus Mode</Text>
          <View className="w-16" />
        </View>

        {/* Status Card */}
        <View className={`rounded-3xl p-8 mb-8 items-center border-b-8 ${focusEnabled ? 'bg-emerald-500 border-emerald-600' : 'bg-slate-800 border-slate-700'}`}>
          <Text className="text-6xl mb-4">{focusEnabled ? '🔒' : '🔓'}</Text>
          <Text className="text-3xl font-black text-white mb-2">
            {focusEnabled ? 'FOCUS MODE ON' : 'Focus Mode Off'}
          </Text>
          <Text className={`text-lg font-semibold ${focusEnabled ? 'text-emerald-100' : 'text-slate-400'}`}>
            {focusEnabled
              ? `${remaining} minutes remaining`
              : 'Lock distracting apps while doing quests'}
          </Text>

          {focusEnabled && (
            <View className="w-full mt-6">
              {/* Progress bar */}
              <View className="h-4 bg-emerald-700 rounded-full overflow-hidden">
                <View
                  className="h-full bg-emerald-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </View>
              <View className="flex-row justify-between mt-2">
                <Text className="text-emerald-200 font-bold text-sm">{elapsedMinutes} min done</Text>
                <Text className="text-emerald-200 font-bold text-sm">{selectedDuration} min total</Text>
              </View>
            </View>
          )}
        </View>

        {/* Duration Picker (only when not active) */}
        {!focusEnabled && (
          <View className="mb-8">
            <Text className="text-lg font-bold text-white mb-4">Focus Duration</Text>
            <View className="flex-row flex-wrap">
              {DURATION_OPTIONS.map(mins => (
                <TouchableOpacity
                  key={mins}
                  onPress={() => setSelectedDuration(mins)}
                  className={`mr-3 mb-3 px-5 py-3 rounded-xl border-2 ${
                    selectedDuration === mins
                      ? 'bg-indigo-600 border-indigo-400'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <Text className={`font-bold ${
                    selectedDuration === mins ? 'text-white' : 'text-slate-400'
                  }`}>
                    {mins < 60 ? `${mins} min` : `${mins / 60}h`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Toggle Button */}
        <TouchableOpacity
          onPress={toggleFocus}
          className={`p-5 rounded-2xl items-center border-b-8 shadow-lg ${
            focusEnabled
              ? 'bg-red-500 border-red-600'
              : 'bg-indigo-600 border-indigo-700'
          }`}
        >
          <Text className="text-white font-black text-xl">
            {focusEnabled ? '🛑 End Focus Session' : '🚀 Start Focus Mode'}
          </Text>
        </TouchableOpacity>

        {/* Info Cards */}
        <View className="mt-8 space-y-4">
          <View className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
            <Text className="text-lg font-bold text-white mb-2">🎯 What is Focus Mode?</Text>
            <Text className="text-slate-400 leading-5">
              Focus Mode helps you stay on track by reminding you to avoid distracting apps like games and social media while you're completing your quests.
            </Text>
          </View>

          <View className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
            <Text className="text-lg font-bold text-white mb-2">⭐ Earn Bonus XP!</Text>
            <Text className="text-slate-400 leading-5">
              Complete quests while Focus Mode is active to earn {'\n'}
              <Text className="text-emerald-400 font-bold">+20% bonus XP</Text> on every quest you finish!
            </Text>
          </View>

          <View className="bg-amber-900 p-5 rounded-2xl border border-amber-700">
            <Text className="text-lg font-bold text-amber-200 mb-2">🔧 Coming Soon</Text>
            <Text className="text-amber-300 leading-5">
              App blocking will be available in a future update with Android Accessibility Service integration. For now, Focus Mode provides a timer and bonus XP incentive.
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
