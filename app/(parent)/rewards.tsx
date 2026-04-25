import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Ionicons } from '@expo/vector-icons';

interface Reward {
  id: string;
  title: string;
  cost: number;
  icon: string;
}

const REWARD_ICONS = ['🎮', '🍕', '🍿', '📱', '🎨', '⚽', '🛍️', '🍦', '🎬', '📚'];

export default function RewardsManager() {
  const router = useRouter();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCost, setNewCost] = useState('200');
  const [selectedIcon, setSelectedIcon] = useState('🎮');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const parentId = auth.currentUser?.uid || 'anonymous';
    const q = query(
      collection(db, 'Rewards'),
      where('parentId', '==', parentId)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const items: Reward[] = [];
      snap.forEach((d) => {
        const data = d.data();
        items.push({ id: d.id, title: data.title, cost: data.cost, icon: data.icon });
      });
      setRewards(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAdd = async () => {
    if (!newTitle) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'Rewards'), {
        title: newTitle,
        cost: parseInt(newCost, 10) || 0,
        icon: selectedIcon,
        parentId: auth.currentUser?.uid || 'anonymous',
        createdAt: serverTimestamp(),
      });
      setNewTitle('');
      setNewCost('200');
      setSelectedIcon('🎮');
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert('Failed to add reward');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Reward', 'Are you sure you want to remove this reward?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try { await deleteDoc(doc(db, 'Rewards', id)); } catch (e) { console.error(e); }
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
            <Ionicons name="arrow-back" size={24} color="#4f46e5" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-800">Rewards Manager</Text>
          <View className="w-8" />
        </View>

        {/* Existing Rewards */}
        {loading ? (
          <ActivityIndicator size="small" color="#4f46e5" className="mt-10" />
        ) : (
          <View className="space-y-3 mb-8">
            {rewards.map(r => (
              <View key={r.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <Text className="text-4xl mr-4">{r.icon}</Text>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-slate-800">{r.title}</Text>
                    <Text className="text-sm font-semibold text-indigo-600">{r.cost} XP</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(r.id)}
                  className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center border border-red-100"
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
            {rewards.length === 0 && (
              <View className="items-center py-10">
                <Text className="text-5xl mb-4">🏆</Text>
                <Text className="text-slate-400 text-center">No rewards yet. Add one below to motivate your kid!</Text>
              </View>
            )}
          </View>
        )}

        {/* Add New Reward */}
        {showForm ? (
          <View className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 mb-4">
            <Text className="text-lg font-bold text-slate-800 mb-4">New Reward</Text>

            <Text className="text-sm font-semibold text-slate-500 mb-2 ml-1">Reward Title</Text>
            <TextInput
              placeholder="e.g., 1 Hour of Video Games"
              value={newTitle}
              onChangeText={setNewTitle}
              className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-lg font-medium text-slate-800 mb-4"
            />

            <Text className="text-sm font-semibold text-slate-500 mb-2 ml-1">XP Cost</Text>
            <TextInput
              placeholder="200"
              value={newCost}
              onChangeText={setNewCost}
              keyboardType="numeric"
              className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-lg font-medium text-slate-800 mb-4"
            />

            <Text className="text-sm font-semibold text-slate-500 mb-2 ml-1">Choose Icon</Text>
            <View className="flex-row flex-wrap mb-6">
              {REWARD_ICONS.map(icon => (
                <TouchableOpacity
                  key={icon}
                  onPress={() => setSelectedIcon(icon)}
                  className={`w-12 h-12 rounded-xl items-center justify-center m-1 ${selectedIcon === icon ? 'bg-indigo-100 border-2 border-indigo-500' : 'bg-slate-100'}`}
                >
                  <Text className="text-2xl">{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => setShowForm(false)}
                className="flex-1 p-4 rounded-xl bg-slate-100 items-center mr-2"
              >
                <Text className="text-slate-600 font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAdd}
                disabled={saving}
                className={`flex-1 p-4 rounded-xl items-center ml-2 ${saving ? 'bg-indigo-400' : 'bg-indigo-600'}`}
              >
                <Text className="text-white font-bold">{saving ? 'Saving...' : 'Add Reward'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShowForm(true)}
            className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 items-center border-dashed"
          >
            <Text className="text-indigo-600 font-bold text-lg">+ Add New Reward</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
