import React from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useNotifications } from '../../hooks/useNotifications';

export default function ParentNotificationsScreen() {
  const router = useRouter();
  const { notifications, loading, markAsRead, markAllAsRead, unreadCount } = useNotifications();

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-row items-center justify-between px-6 pt-8 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Text className="text-indigo-600 font-bold text-lg">← Back</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-800">Alerts</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllAsRead} className="p-2 bg-indigo-100 rounded-full px-3">
            <Text className="text-indigo-700 font-bold text-xs">Read All</Text>
          </TouchableOpacity>
        ) : (
          <View className="w-16" />
        )}
      </View>

      <ScrollView className="px-6">
        {loading ? (
          <ActivityIndicator size="large" color="#4f46e5" className="mt-10" />
        ) : notifications.length === 0 ? (
          <View className="items-center justify-center mt-20">
            <Text className="text-6xl mb-4">📭</Text>
            <Text className="text-lg text-slate-400 font-medium">No notifications yet</Text>
          </View>
        ) : (
          notifications.map((notif) => (
            <TouchableOpacity 
              key={notif.id}
              onPress={() => {
                if (!notif.isRead) markAsRead(notif.id);
                // Optionally route to specific task: if (notif.taskId) router.push(`/(parent)/tasks/${notif.taskId}`);
              }}
              className={`p-4 mb-3 rounded-2xl border ${notif.isRead ? 'bg-white border-slate-100' : 'bg-indigo-50 border-indigo-200'}`}
            >
              <View className="flex-row items-start">
                <View className="mr-3 mt-1">
                  <Text className="text-2xl">
                    {notif.type === 'task_submitted' ? '⭐' : notif.type === 'reward_claimed' ? '🏆' : '🔔'}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className={`text-base font-bold ${notif.isRead ? 'text-slate-700' : 'text-indigo-900'}`}>
                    {notif.title}
                  </Text>
                  <Text className={`text-sm mt-1 ${notif.isRead ? 'text-slate-500' : 'text-indigo-700'}`}>
                    {notif.body}
                  </Text>
                  {notif.createdAt?.seconds && (
                    <Text className="text-xs text-slate-400 mt-2 font-medium">
                      {new Date(notif.createdAt.seconds * 1000).toLocaleString()}
                    </Text>
                  )}
                </View>
                {!notif.isRead && (
                  <View className="w-3 h-3 rounded-full bg-indigo-500 mt-2" />
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
