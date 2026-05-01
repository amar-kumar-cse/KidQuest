import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  TextInput,
  Image,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { taskService } from '../../../services/taskService';
import { TaskStatusBadge } from '../../../components/tasks/TaskStatusBadge';
import { getCategoryDef } from '../../../constants/TaskCategories';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import type { Task } from '../../../types';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [bonusXp, setBonusXp] = useState('0');
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'Tasks', id), (snap) => {
      setTask(snap.exists() ? ({ id: snap.id, ...snap.data() } as Task) : null);
      setLoading(false);
    });
    return unsub;
  }, [id]);

  const handleApprove = async () => {
    if (!task) return;
    const bonus = parseInt(bonusXp, 10) || 0;
    Alert.alert(
      'Approve Task',
      `Award ${task.xp + bonus} XP to ${task.assignedToName}?${bonus > 0 ? ` (+${bonus} bonus)` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve ✓',
          onPress: async () => {
            setActioning(true);
            try {
              await taskService.approveTask(task.id, bonus);
              Alert.alert('✅ Approved!', `${task.xp + bonus} XP awarded!`);
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setActioning(false);
            }
          },
        },
      ],
    );
  };

  const handleReject = async () => {
    if (!task || !rejectNote.trim()) {
      Alert.alert('Feedback Required', 'Please add feedback for the kid before rejecting.');
      return;
    }
    setActioning(true);
    try {
      await taskService.rejectTask(task.id, rejectNote.trim());
      setShowRejectInput(false);
      Alert.alert('Task Sent Back', 'Kid will be notified to redo it.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActioning(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading task..." />;
  if (!task) return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <Text className="text-slate-500">Task not found.</Text>
    </SafeAreaView>
  );

  const catDef = getCategoryDef(task.category);
  const dueDate = task.dueDate?.toDate?.() ?? new Date(task.dueDate);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Text className="text-indigo-600 font-bold">← Back</Text>
        </TouchableOpacity>

        {/* Category + Status */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: catDef.bg }}>
              <Text className="text-xl">{catDef.icon}</Text>
            </View>
            <Text className="text-slate-500 font-medium">{catDef.label}</Text>
          </View>
          <TaskStatusBadge status={task.status} />
        </View>

        {/* Title */}
        <Text className="text-2xl font-extrabold text-slate-800 mb-2">{task.title}</Text>
        <Text className="text-slate-500 leading-6 mb-4">{task.description}</Text>

        {/* Meta */}
        <View className="bg-white rounded-2xl p-4 border border-slate-100 mb-4 space-y-3">
          <MetaRow label="Assigned to" value={task.assignedToName ?? task.assignedTo ?? 'Unknown'} />
          <MetaRow label="XP Reward" value={`${task.finalXp ?? task.xp} XP`} highlight />
          <MetaRow label="Difficulty" value={task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1)} />
          <MetaRow label="Due Date" value={dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
        </View>

        {/* Proof */}
        {task.proofUrl && (
          <View className="mb-4">
            <Text className="text-sm font-bold text-slate-600 mb-2">Photo Proof</Text>
            <TouchableOpacity onPress={() => Linking.openURL(task.proofUrl!)}>
              <Image source={{ uri: task.proofUrl }} className="w-full h-48 rounded-2xl" resizeMode="cover" />
            </TouchableOpacity>
            {task.proofNote && (
              <View className="mt-2 bg-slate-50 p-3 rounded-xl">
                <Text className="text-xs text-slate-500 italic">Kid's note: "{task.proofNote}"</Text>
              </View>
            )}
          </View>
        )}

        {/* Approve actions */}
        {task.status === 'pending_approval' && (
          <View>
            {/* Bonus XP */}
            <View className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 mb-4">
              <Text className="text-sm font-bold text-indigo-700 mb-2">Bonus XP (optional)</Text>
              <TextInput
                value={bonusXp}
                onChangeText={setBonusXp}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#A5B4FC"
                className="bg-white border border-indigo-200 rounded-xl p-3 text-indigo-700 font-bold text-lg"
              />
            </View>

            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => setShowRejectInput(!showRejectInput)}
                className="flex-1 bg-red-50 border border-red-200 py-4 rounded-2xl items-center"
              >
                <Text className="text-red-600 font-bold">✗ Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleApprove}
                disabled={actioning}
                className="flex-1 bg-green-500 py-4 rounded-2xl items-center"
              >
                <Text className="text-white font-black">
                  {actioning ? '...' : '✓ Approve'}
                </Text>
              </TouchableOpacity>
            </View>

            {showRejectInput && (
              <View className="mt-4">
                <Text className="text-sm font-semibold text-slate-600 mb-2">Feedback for Kid</Text>
                <TextInput
                  value={rejectNote}
                  onChangeText={setRejectNote}
                  placeholder="Tell them what to improve..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  className="bg-white border border-slate-200 rounded-xl p-4 text-slate-700 mb-3"
                  textAlignVertical="top"
                />
                <TouchableOpacity onPress={handleReject} disabled={actioning} className="bg-red-500 py-3 rounded-xl items-center">
                  <Text className="text-white font-bold">{actioning ? 'Rejecting...' : 'Send Back to Kid'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetaRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-slate-400 text-sm">{label}</Text>
      <Text className={`font-semibold ${highlight ? 'text-indigo-600' : 'text-slate-700'}`}>{value}</Text>
    </View>
  );
}
