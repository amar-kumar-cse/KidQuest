import { useState, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { taskService } from '../../../services/taskService';
import { ProofUploader } from '../../../components/tasks/ProofUploader';
import { TaskStatusBadge } from '../../../components/tasks/TaskStatusBadge';
import { getCategoryDef } from '../../../constants/TaskCategories';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import type { Task } from '../../../types';

export default function KidTaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'Tasks', id), (snap) => {
      setTask(snap.exists() ? ({ id: snap.id, ...snap.data() } as Task) : null);
      setLoading(false);
    });
    return unsub;
  }, [id]);

  const handleProofReady = async (proofUrl: string, note?: string) => {
    if (!task) return;
    setSubmitting(true);
    try {
      await taskService.submitProof(task.id, proofUrl, note);
      Alert.alert('🚀 Submitted!', 'Your proof has been sent to your parent for review!');
      setShowUploader(false);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not submit proof.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <LoadingSpinner fullScreen />;
  if (!task) return (
    <SafeAreaView className="flex-1 bg-amber-50 items-center justify-center">
      <Text className="text-slate-500">Quest not found.</Text>
    </SafeAreaView>
  );

  const catDef = getCategoryDef(task.category);
  const dueDate = task.dueDate?.toDate?.() ?? new Date(task.dueDate);

  return (
    <SafeAreaView className="flex-1 bg-amber-50">
      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Text className="text-yellow-700 font-bold">← Back</Text>
        </TouchableOpacity>

        {/* Status */}
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: catDef.bg }}>
              <Text className="text-xl">{catDef.icon}</Text>
            </View>
            <Text className="text-slate-500 font-medium">{catDef.label}</Text>
          </View>
          <TaskStatusBadge status={task.status} />
        </View>

        <Text className="text-2xl font-black text-yellow-900 mb-2">{task.title}</Text>
        <Text className="text-slate-500 mb-6 leading-6">{task.description}</Text>

        {/* XP reward */}
        <View className="bg-indigo-600 rounded-2xl p-5 mb-6 flex-row items-center">
          <Text className="text-4xl mr-4">⭐</Text>
          <View>
            <Text className="text-indigo-200 text-sm font-semibold">XP Reward</Text>
            <Text className="text-white font-black text-3xl">{task.xp} XP</Text>
          </View>
        </View>

        {/* Due date */}
        <View className="bg-white rounded-2xl p-4 border border-slate-100 mb-6">
          <Text className="text-slate-400 text-xs mb-1">Due Date</Text>
          <Text className="text-slate-700 font-bold">{dueDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        </View>

        {/* Parent rejection note */}
        {task.parentNote && task.status === 'pending' && (
          <View className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6">
            <Text className="text-xs font-bold text-red-500 mb-1">Parent Feedback:</Text>
            <Text className="text-red-700">{task.parentNote}</Text>
          </View>
        )}

        {/* Proof uploader */}
        {task.status === 'pending' && !showUploader && (
          <TouchableOpacity onPress={() => setShowUploader(true)} className="bg-green-500 border-b-4 border-green-600 py-5 rounded-2xl items-center flex-row justify-center">
            <Text className="text-white font-black text-xl mr-2">🚀</Text>
            <Text className="text-white font-black text-xl">Submit Proof!</Text>
          </TouchableOpacity>
        )}

        {task.status === 'pending' && showUploader && (
          <ProofUploader taskId={task.id} onProofReady={handleProofReady} />
        )}

        {task.status === 'pending_approval' && (
          <View className="bg-amber-100 border border-amber-200 rounded-2xl p-5 items-center">
            <Text className="text-3xl mb-2">⏳</Text>
            <Text className="text-amber-800 font-black text-lg">Waiting for Review</Text>
            <Text className="text-amber-600 text-sm mt-1 text-center">Your parent will review your proof soon!</Text>
          </View>
        )}

        {task.status === 'completed' && (
          <View className="bg-green-100 border border-green-200 rounded-2xl p-5 items-center">
            <Text className="text-4xl mb-2">🎉</Text>
            <Text className="text-green-700 font-black text-xl">Completed!</Text>
            <Text className="text-green-600 font-bold text-lg mt-1">+{task.finalXp ?? task.xp} XP earned!</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
