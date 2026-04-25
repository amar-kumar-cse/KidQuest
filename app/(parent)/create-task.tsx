import {
  View, Text, TouchableOpacity, ScrollView, SafeAreaView,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { createTask, TaskCategory } from '../../lib/firestoreService';
import { DIFFICULTY_LABELS, type TaskDifficulty } from '../../lib/constants';

const CATEGORIES: { label: string; value: TaskCategory; icon: string }[] = [
  { label: 'Homework', value: 'homework', icon: '📚' },
  { label: 'Chores',   value: 'chores',   icon: '🧹' },
  { label: 'Reading',  value: 'reading',  icon: '📖' },
  { label: 'Exercise', value: 'exercise', icon: '🏃' },
  { label: 'Other',    value: 'other',    icon: '📝' },
];

const DIFFICULTIES: TaskDifficulty[] = ['easy', 'medium', 'hard'];

interface LinkedKid { uid: string; name: string; }

export default function CreateTask() {
  const router    = useRouter();
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [xp,          setXp]          = useState('100');
  const [category,    setCategory]    = useState<TaskCategory>('other');
  const [difficulty,  setDifficulty]  = useState<TaskDifficulty>('easy');
  const [dueInHours,  setDueInHours]  = useState('');
  const [loading,     setLoading]     = useState(false);

  // Linked kids loaded from parent's Firestore profile
  const [linkedKids,    setLinkedKids]    = useState<LinkedKid[]>([]);
  const [selectedKid,   setSelectedKid]   = useState<LinkedKid | null>(null);
  const [loadingKids,   setLoadingKids]   = useState(true);

  const selectedCategory = CATEGORIES.find(c => c.value === category)!;

  // ── Fetch linked kids from parent's profile ──────────────────────
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoadingKids(false); return; }

    getDoc(doc(db, 'Users', uid))
      .then(async (parentSnap) => {
        if (!parentSnap.exists()) return;
        const kidUids: string[] = parentSnap.data().linkedKids || [];

        // Fetch each kid's name
        const kids = await Promise.all(
          kidUids.map(async (kidUid) => {
            try {
              const kidSnap = await getDoc(doc(db, 'Users', kidUid));
              return kidSnap.exists()
                ? { uid: kidUid, name: kidSnap.data().name || 'Kid' }
                : null;
            } catch { return null; }
          }),
        );

        const validKids = kids.filter(Boolean) as LinkedKid[];
        setLinkedKids(validKids);
        if (validKids.length > 0) setSelectedKid(validKids[0]);
      })
      .catch((err) => console.warn('[CreateTask] Failed to load kids:', err))
      .finally(() => setLoadingKids(false));
  }, []);

  const handleCreateTask = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Info', 'Please enter a task title.');
      return;
    }
    if (!selectedKid) {
      Alert.alert('No Kid Selected', 'Please link a kid account first from Settings.');
      return;
    }

    setLoading(true);
    try {
      await createTask({
        title,
        description,
        xp        : parseInt(xp, 10) || 100,
        difficulty,
        assignedTo   : selectedKid.name,
        assignedToUid: selectedKid.uid,
        category,
        icon      : selectedCategory.icon,
        dueInHours: dueInHours ? parseFloat(dueInHours) : undefined,
      });
      router.back();
    } catch (error: any) {
      console.error('[CreateTask]', error);
      Alert.alert('Failed to Save', error?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-6 pt-8 pb-20">

        {/* Header */}
        <View className="flex-row items-center justify-between mb-8 pb-4 border-b border-slate-100">
          <TouchableOpacity onPress={() => router.back()} className="p-2" disabled={loading}>
            <Text className="text-indigo-600 font-bold">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-800">Assign New Task</Text>
          <TouchableOpacity className="p-2" onPress={handleCreateTask} disabled={loading}>
            <Text className="text-indigo-600 font-bold">{loading ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        <View className="space-y-6">

          {/* Task Title */}
          <View>
            <Text className="text-sm font-semibold text-slate-500 mb-2 ml-1">Task Title</Text>
            <TextInput
              placeholder="e.g., Read for 30 minutes"
              value={title}
              onChangeText={setTitle}
              className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-lg font-medium text-slate-800"
            />
          </View>

          {/* Description */}
          <View>
            <Text className="text-sm font-semibold text-slate-500 mb-2 ml-1">Description</Text>
            <TextInput
              placeholder="Add details about the task..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-base font-medium text-slate-800 min-h-[90px]"
            />
          </View>

          {/* Category */}
          <View>
            <Text className="text-sm font-semibold text-slate-500 mb-2 ml-1">Category</Text>
            <View className="flex-row flex-wrap">
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  onPress={() => setCategory(cat.value)}
                  className={`mr-2 mb-2 px-4 py-3 rounded-xl border flex-row items-center ${
                    category === cat.value
                      ? 'bg-indigo-50 border-indigo-400'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <Text className="text-lg mr-1">{cat.icon}</Text>
                  <Text className={`text-sm font-semibold ${
                    category === cat.value ? 'text-indigo-700' : 'text-slate-600'
                  }`}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Difficulty */}
          <View>
            <Text className="text-sm font-semibold text-slate-500 mb-2 ml-1">Difficulty</Text>
            <View className="flex-row space-x-2">
              {DIFFICULTIES.map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDifficulty(d)}
                  className={`flex-1 py-3 rounded-xl border items-center ${
                    difficulty === d
                      ? 'bg-indigo-50 border-indigo-400'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <Text className={`text-sm font-bold ${
                    difficulty === d ? 'text-indigo-700' : 'text-slate-600'
                  }`}>{DIFFICULTY_LABELS[d]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text className="text-xs text-slate-400 mt-1 ml-1">
              Harder tasks earn more XP (Easy×1, Medium×1.5, Hard×2)
            </Text>
          </View>

          {/* XP + Due In */}
          <View className="flex-row space-x-4">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-slate-500 mb-2 ml-1">Base XP</Text>
              <TextInput
                placeholder="100"
                value={xp}
                onChangeText={setXp}
                keyboardType="numeric"
                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-lg font-medium text-slate-800"
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-slate-500 mb-2 ml-1">Due In (hours)</Text>
              <TextInput
                placeholder="e.g., 2"
                value={dueInHours}
                onChangeText={setDueInHours}
                keyboardType="decimal-pad"
                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-lg font-medium text-slate-800"
              />
            </View>
          </View>

          {/* Assign To — Dynamic Kid Picker */}
          <View>
            <Text className="text-sm font-semibold text-slate-500 mb-2 ml-1">Assign To</Text>
            {loadingKids ? (
              <ActivityIndicator color="#4f46e5" />
            ) : linkedKids.length === 0 ? (
              <View className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <Text className="text-amber-700 font-semibold text-sm">
                  ⚠️ No kids linked yet. Go to Settings → Link Kid Account.
                </Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap">
                {linkedKids.map((kid) => (
                  <TouchableOpacity
                    key={kid.uid}
                    onPress={() => setSelectedKid(kid)}
                    className={`mr-2 mb-2 px-5 py-3 rounded-xl border ${
                      selectedKid?.uid === kid.uid
                        ? 'bg-indigo-50 border-indigo-400'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text className={`font-bold ${
                      selectedKid?.uid === kid.uid ? 'text-indigo-700' : 'text-slate-700'
                    }`}>👦 {kid.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

        </View>

        {/* Submit Button */}
        <TouchableOpacity
          className={`mt-10 p-5 rounded-2xl shadow-md items-center ${
            loading || !selectedKid ? 'bg-indigo-300' : 'bg-indigo-600'
          }`}
          onPress={handleCreateTask}
          disabled={loading || !selectedKid}
        >
          <Text className="text-white font-bold text-lg tracking-wide">
            {loading ? 'Assigning...' : 'Assign Task ✓'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
