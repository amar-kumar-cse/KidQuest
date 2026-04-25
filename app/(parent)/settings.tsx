import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../lib/firebase';
import { registerForPushNotificationsAsync, scheduleDailyReminder, cancelDailyReminder } from '../../lib/notificationService';

export default function ParentSettings() {
  const router = useRouter();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [reminderHour, setReminderHour] = useState(16); // 4 PM

  useEffect(() => {
    // Check if push is already set up
    registerForPushNotificationsAsync().then(token => {
      if (token) setPushEnabled(true);
    });
  }, []);

  const togglePush = async () => {
    if (!pushEnabled) {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        setPushEnabled(true);
        Alert.alert('✅ Notifications Enabled', 'You will receive alerts when your kid completes tasks.');
        // In production: save this token to Firestore under the user's profile
      } else {
        Alert.alert('Permission Denied', 'Please enable notifications in your device settings.');
      }
    } else {
      setPushEnabled(false);
    }
  };

  const toggleDailyReminder = async () => {
    if (dailyReminder) {
      await cancelDailyReminder();
      setDailyReminder(false);
    } else {
      await scheduleDailyReminder(reminderHour, 0);
      setDailyReminder(true);
      Alert.alert('⏰ Reminder Set', `Your kid will be reminded daily at ${reminderHour > 12 ? reminderHour - 12 : reminderHour}:00 ${reminderHour >= 12 ? 'PM' : 'AM'}.`);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive', onPress: async () => {
          try {
            await auth.signOut();
            router.replace('/(auth)/login');
          } catch (err) {
            console.error(err);
          }
        }
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="px-6 pt-8 pb-20">

        {/* Header */}
        <View className="flex-row items-center justify-between mb-8">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Text className="text-indigo-600 font-bold text-lg">← Back</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-800">Settings</Text>
          <View className="w-16" />
        </View>

        {/* Notification Settings */}
        <Text className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">Notifications</Text>
        <View className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-6">
          <View className="flex-row items-center justify-between p-5 border-b border-slate-50">
            <View className="flex-1 mr-4">
              <Text className="text-base font-bold text-slate-800">Push Notifications</Text>
              <Text className="text-xs text-slate-400 mt-1">Get alerts for task completions & approvals</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={togglePush}
              trackColor={{ false: '#e2e8f0', true: '#818cf8' }}
              thumbColor={pushEnabled ? '#4f46e5' : '#f4f4f5'}
            />
          </View>
          <View className="flex-row items-center justify-between p-5">
            <View className="flex-1 mr-4">
              <Text className="text-base font-bold text-slate-800">Daily Reminder (4 PM)</Text>
              <Text className="text-xs text-slate-400 mt-1">Remind your kid to complete quests</Text>
            </View>
            <Switch
              value={dailyReminder}
              onValueChange={toggleDailyReminder}
              trackColor={{ false: '#e2e8f0', true: '#818cf8' }}
              thumbColor={dailyReminder ? '#4f46e5' : '#f4f4f5'}
            />
          </View>
        </View>

        {/* Navigation */}
        <Text className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">Quick Links</Text>
        <View className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-6">
          <TouchableOpacity
            className="p-5 border-b border-slate-50 flex-row justify-between items-center"
            onPress={() => router.push('/(parent)/rewards')}
          >
            <Text className="text-base font-semibold text-slate-800">🏆 Manage Rewards</Text>
            <Text className="text-slate-400">→</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="p-5 border-b border-slate-50 flex-row justify-between items-center"
            onPress={() => router.push('/(parent)/analytics')}
          >
            <Text className="text-base font-semibold text-slate-800">📊 View Analytics</Text>
            <Text className="text-slate-400">→</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="p-5 flex-row justify-between items-center"
            onPress={() => router.push('/(parent)/create-task')}
          >
            <Text className="text-base font-semibold text-slate-800">📝 Assign New Task</Text>
            <Text className="text-slate-400">→</Text>
          </TouchableOpacity>
        </View>

        {/* Account */}
        <Text className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">Account</Text>
        <View className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-6">
          <View className="p-5 border-b border-slate-50">
            <Text className="text-base font-semibold text-slate-800">Email</Text>
            <Text className="text-sm text-slate-400 mt-1">{auth.currentUser?.email || 'Not logged in'}</Text>
          </View>
          <TouchableOpacity
            className="p-5"
            onPress={handleLogout}
          >
            <Text className="text-base font-semibold text-red-500">Logout</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View className="items-center mt-4">
          <Text className="text-sm font-bold text-slate-300">KidQuest v1.0.0</Text>
          <Text className="text-xs text-slate-300 mt-1">Your child's growth, our peace of mind.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
