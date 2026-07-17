import React from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useNotifications } from '../../hooks/useNotifications';

export default function KidNotificationsScreen() {
  const router = useRouter();
  const { notifications, loading, markAsRead, markAllAsRead, unreadCount } = useNotifications();

  return (
    <SafeAreaView className="flex-1 bg-amber-50">
      <View className="flex-row items-center justify-between px-6 pt-8 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="p-2 bg-amber-200 rounded-full">
          <Text className="text-amber-800 font-black">← Back</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-black text-amber-900">Alerts 🔔</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllAsRead} className="p-2 bg-amber-200 rounded-full px-4">
            <Text className="text-amber-800 font-black text-sm">Read All</Text>
          </TouchableOpacity>
        ) : (
          <View className="w-20" />
        )}
      </View>

      <ScrollView className="px-6">
        {loading ? (
          <ActivityIndicator size="large" color="#d97706" className="mt-10" />
        ) : notifications.length === 0 ? (
          <View className="items-center justify-center mt-20">
            <Text className="text-6xl mb-4">📭</Text>
            <Text className="text-xl text-amber-700 font-bold">All caught up!</Text>
          </View>
        ) : (
          notifications.map((notif) => (
            <TouchableOpacity 
              key={notif.id}
              onPress={() => {
                if (!notif.isRead) markAsRead(notif.id);
                // Optionally route to specific task: if (notif.taskId) router.push(`/(kid)/tasks/${notif.taskId}`);
              }}
              className={`p-5 mb-4 rounded-3xl border-b-4 ${notif.isRead ? 'bg-white border-amber-200 opacity-80' : 'bg-amber-100 border-amber-300 shadow-sm'}`}
            >
              <View className="flex-row items-start">
                <View className="mr-4 mt-1 bg-white p-2 rounded-2xl">
                  <Text className="text-3xl">
                    {notif.type === 'task_approved' ? '🎉' : notif.type === 'task_rejected' ? '🔄' : '🔔'}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className={`text-xl font-black ${notif.isRead ? 'text-amber-800' : 'text-amber-900'}`}>
                    {notif.title}
                  </Text>
                  <Text className={`text-base mt-1 ${notif.isRead ? 'text-amber-700' : 'text-amber-800 font-medium'}`}>
                    {notif.body}
                  </Text>
                  {notif.createdAt?.seconds && (
                    <Text className="text-xs text-amber-600 mt-3 font-bold opacity-70">
                      {new Date(notif.createdAt.seconds * 1000).toLocaleString()}
                    </Text>
                  )}
                </View>
                {!notif.isRead && (
                  <View className="w-4 h-4 rounded-full bg-red-500 mt-2" />
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
