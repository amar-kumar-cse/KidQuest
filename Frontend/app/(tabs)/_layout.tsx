import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useChatStore } from '@/store/useChatStore';
import { auth } from '@/lib/firebase';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const totalUnreadCount = useChatStore((state) => state.totalUnreadCount);
  const subscribeToConversations = useChatStore((state) => state.subscribeToConversations);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      const unsub = subscribeToConversations(uid);
      return () => unsub();
    }
  }, [auth.currentUser?.uid]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarBadge: totalUnreadCount > 0 ? totalUnreadCount : undefined,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
