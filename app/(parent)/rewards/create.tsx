import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../../lib/firebase';
import { rewardService } from '../../../services/rewardService';

const EMOJI_OPTIONS = ['🎮', '🍕', '🎬', '🎡', '🧸', '📱', '🎯', '⚽', '🎪', '🍦', '🛍️', '📚'];

export default function CreateRewardScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [xpCost, setXpCost] = useState('');
  const [icon, setIcon] = useState(EMOJI_OPTIONS[0]);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const parentId = auth.currentUser?.uid;
    if (!parentId) return;
    const trimTitle = title.trim();
    const cost = parseInt(xpCost, 10);
    if (!trimTitle) { Alert.alert('Required', 'Please enter a reward title.'); return; }
    if (!xpCost || isNaN(cost) || cost < 1) { Alert.alert('Invalid', 'Enter a valid XP cost (min 1).'); return; }
    setLoading(true);
    try {
      await rewardService.createReward(parentId, { title: trimTitle, description: description.trim() || undefined, xpCost: cost, iconEmoji: icon });
      Alert.alert('Created! 🎁', `"${trimTitle}" is now available.`, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not create reward.');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
      <SafeAreaView className="flex-1">
        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 40 }}>
          <TouchableOpacity onPress={() => router.back()} className="pt-6 mb-4">
            <Text className="text-indigo-600 font-bold">← Back</Text>
          </TouchableOpacity>
          <Text className="text-3xl font-extrabold text-slate-800 mb-6">New Reward 🎁</Text>
          <Text className="text-sm font-bold text-slate-600 mb-2">Choose Icon</Text>
          <View className="flex-row flex-wrap gap-3 mb-6">
            {EMOJI_OPTIONS.map((e) => (
              <TouchableOpacity key={e} onPress={() => setIcon(e)} className={`w-14 h-14 rounded-2xl items-center justify-center ${icon === e ? 'bg-indigo-600' : 'bg-slate-100'}`}>
                <Text className="text-2xl">{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-sm font-semibold text-slate-600 mb-1.5">Reward Title *</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Extra Screen Time" placeholderTextColor="#9CA3AF" className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 text-base mb-4" />
          <Text className="text-sm font-semibold text-slate-600 mb-1.5">Description (optional)</Text>
          <TextInput value={description} onChangeText={setDescription} placeholder="Any details..." placeholderTextColor="#9CA3AF" multiline numberOfLines={3} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 mb-4" textAlignVertical="top" />
          <Text className="text-sm font-semibold text-slate-600 mb-1.5">XP Cost *</Text>
          <TextInput value={xpCost} onChangeText={setXpCost} placeholder="e.g. 200" placeholderTextColor="#9CA3AF" keyboardType="number-pad" className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 text-base mb-8" />
          <TouchableOpacity onPress={handleCreate} disabled={loading} className={`bg-indigo-600 py-4 rounded-2xl items-center ${loading ? 'opacity-60' : ''}`}>
            <Text className="text-white font-black text-lg">{loading ? 'Creating...' : 'Create Reward 🎁'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
