import { useState, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../../lib/firebase';
import { userService } from '../../../services/userService';
import { taskService } from '../../../services/taskService';
import { KidSummaryCard } from '../../../components/parent/KidSummaryCard';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { Kid, Task } from '../../../types';

export default function KidsListScreen() {
  const router = useRouter();
  const [kids, setKids] = useState<Kid[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const parentId = auth.currentUser?.uid;
      if (!parentId) return;
      const parent = await userService.getUserProfile(parentId);
      if (parent?.role === 'parent' && parent.linkedKids?.length) {
        const kidProfiles = await userService.getKidProfiles(parent.linkedKids);
        setKids(kidProfiles);
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6 pt-8 pb-4">
          <Text className="text-3xl font-extrabold text-slate-800">My Kids</Text>
          <Text className="text-slate-400 mt-1">{kids.length} linked</Text>
        </View>
        <View className="px-6">
          {loading ? (
            <LoadingSpinner message="Loading kids..." />
          ) : kids.length === 0 ? (
            <EmptyState
              icon="👨‍👩‍👧"
              title="No Kids Linked"
              message="Share your family code from Settings for your kids to join."
              action={
                <TouchableOpacity onPress={() => router.push('/(parent)/settings')} className="bg-indigo-600 px-6 py-3 rounded-xl mt-2">
                  <Text className="text-white font-bold">Go to Settings</Text>
                </TouchableOpacity>
              }
            />
          ) : (
            kids.map((kid) => (
              <KidSummaryCard key={kid.uid} kid={kid} onPress={() => router.push(`/(parent)/kids/${kid.uid}` as any)} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
