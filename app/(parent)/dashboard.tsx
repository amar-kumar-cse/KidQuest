import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Alert, Linking } from 'react-native';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { approveTask, rejectTask } from '../../lib/firestoreService';
import { useTasks, AssignedTask } from '../../hooks/useTasks';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';

export default function ParentDashboard() {
  const router = useRouter();
  const [linkedKids, setLinkedKids] = useState<any[]>([]);
  const [selectedKidUid, setSelectedKidUid] = useState<string | null>(null);
  const [linkedKidsLoading, setLinkedKidsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { tasks: pendingApprovals, loading: tasksLoading } = useTasks('parent', auth.currentUser?.uid, ['pending_approval']);
  const loading = tasksLoading || linkedKidsLoading;

  // Fetch parent's linked kids and listen to their XP
  useEffect(() => {
    const parentUid = auth.currentUser?.uid;
    if (!parentUid) return;

    // 1. Fetch linked kids from parent profile
    const fetchLinkedKidsXp = async () => {
      try {
        const parentSnap = await getDoc(doc(db, 'Users', parentUid));
        if (!parentSnap.exists()) {
          setLinkedKidsLoading(false);
          return;
        }

        const linkedKidIds: string[] = parentSnap.data().linkedKids || [];
        if (linkedKidIds.length === 0) {
          setLinkedKidsLoading(false);
          return;
        }

        // 2. Set up a listener for only the linked kids
        // Firestore 'in' query works up to 10 items, which is perfect for linked kids
        const qKids = query(
          collection(db, 'Users'),
          where('uid', 'in', linkedKidIds)
        );

        const unsubscribeKids = onSnapshot(qKids, (snapshot) => {
          const kidsData: any[] = [];
          snapshot.forEach((docSnap) => {
            kidsData.push({ uid: docSnap.id, ...docSnap.data() });
          });
          setLinkedKids(kidsData);
          if (kidsData.length > 0 && !selectedKidUid) {
            setSelectedKidUid(kidsData[0].uid);
          }
          setLinkedKidsLoading(false);
        });

        return unsubscribeKids;
      } catch (error) {
        console.error('Error fetching linked kids XP:', error);
        setLinkedKidsLoading(false);
      }
    };

    let unsub: any;
    fetchLinkedKidsXp().then(res => { unsub = res; });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const handleApprove = (task: AssignedTask) => {
    const childName = task.assignedTo || 'Kid';
    Alert.alert(
      'Approve Task',
      `Approve "${task.title}" and award ${task.xp} XP to ${childName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve ✓',
          style: 'default',
          onPress: async () => {
            setActionLoading(task.id);
            try {
              await approveTask(task.id);
            } catch (err) {
              console.error(err);
              alert('Failed to approve task');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = (task: AssignedTask) => {
    const childName = task.assignedTo || 'Kid';
    Alert.alert(
      'Reject Task',
      `Send "${task.title}" back to ${childName}? They'll need to redo it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject ✗',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(task.id);
            try {
              await rejectTask(task.id);
            } catch (err) {
              console.error(err);
              alert('Failed to reject task');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      homework: '📚',
      chores: '🧹',
      reading: '📖',
      exercise: '🏃',
      other: '📝',
    };
    return icons[category] || '📝';
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="px-6 pt-8 pb-20">
        
        {/* Header */}
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Control Center</Text>
            <Text className="text-3xl font-extrabold text-slate-800 mt-1">Dashboard</Text>
          </View>
          <TouchableOpacity 
            className="w-12 h-12 bg-indigo-100 rounded-full items-center justify-center border border-indigo-200"
            onPress={() => router.push('/(parent)/settings')}
          >
            <Text className="text-lg">⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Analytics Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8">
          <View className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mr-4 min-w-[140px]">
            <Text className="text-slate-500 font-semibold mb-1">Pending Review</Text>
            <Text className="text-3xl font-bold text-amber-600">{pendingApprovals.length}</Text>
            <Text className="text-xs text-slate-400 mt-2 font-medium">Tasks awaiting approval</Text>
          </View>
          
          {linkedKids.map((kid, index) => (
            <Animated.View 
              key={kid.uid} 
              entering={FadeInUp.delay(index * 100).springify()}
              className="bg-indigo-600 p-5 rounded-2xl shadow-md mr-4 min-w-[160px]"
            >
              <View className="flex-row items-center mb-1">
                <Text className="text-2xl mr-2">{kid.avatarEmoji || '👦'}</Text>
                <Text className="text-indigo-200 font-semibold">{kid.name}'s XP</Text>
              </View>
              <Text className="text-3xl font-bold text-white">
                {kid.totalXp?.toLocaleString() || 0}
              </Text>
              <TouchableOpacity 
                className="mt-3 bg-indigo-500 py-1.5 px-3 rounded-lg self-start"
                onPress={() => router.push('/(parent)/rewards')}
              >
                <Text className="text-white text-xs font-bold tracking-wide">Manage Rewards →</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
          
          {linkedKids.length === 0 && !linkedKidsLoading && (
            <View className="bg-amber-50 p-5 rounded-2xl border border-amber-100 mr-4">
              <Text className="text-amber-700 font-semibold mb-1">No Kids Linked</Text>
              <TouchableOpacity 
                className="mt-2 bg-amber-200 py-1.5 px-3 rounded-lg self-start"
                onPress={() => router.push('/(parent)/settings')}
              >
                <Text className="text-amber-800 text-xs font-bold">Link a Kid →</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Action Items (Smart Reward Logic) */}
        <Text className="text-lg font-bold text-slate-800 mb-4">Pending Approvals</Text>
        
        {loading ? (
          <SkeletonLoader rows={3} rowHeight={88} style={{ paddingHorizontal: 0, marginBottom: 8 }} />
        ) : (
          <View className="space-y-3 mb-8">
            {pendingApprovals.map((task, index) => {
              const childName = task.assignedTo || 'Kid';
              const timeString = new Date(task.completedAt?.toDate?.() || task.createdAt?.toDate?.() || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
              
              return (
                <Animated.View 
                  key={task.id} 
                  entering={FadeInUp.delay(index * 100).springify()}
                  layout={Layout.springify()}
                  className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-1">
                        <View className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                        <Text className="text-xs font-bold text-slate-500">
                          {getCategoryIcon(task.category)} {childName} • {timeString}
                        </Text>
                      </View>
                      <Text className="text-lg font-bold text-slate-800">{task.title}</Text>
                      <Text className="text-sm font-semibold text-indigo-600 mt-1">Reward: {task.xp} XP</Text>
                    </View>

                    <View className="flex-row space-x-2">
                      <TouchableOpacity 
                        className="bg-red-50 w-12 h-12 rounded-xl items-center justify-center border border-red-100"
                        onPress={() => handleReject(task)}
                        disabled={actionLoading === task.id}
                      >
                        <Text className="text-red-500 font-bold">{actionLoading === task.id ? '...' : '✗'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        className="bg-green-500 w-12 h-12 rounded-xl items-center justify-center shadow-sm"
                        onPress={() => handleApprove(task)}
                        disabled={actionLoading === task.id}
                      >
                        <Text className="text-white font-bold">{actionLoading === task.id ? '...' : '✓'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Proof Link */}
                  {task.proofUrl ? (
                    <TouchableOpacity 
                      className="mt-3 bg-sky-50 p-3 rounded-xl border border-sky-100 flex-row items-center"
                      onPress={() => Linking.openURL(task.proofUrl!)}
                    >
                      <Text className="text-sky-600 mr-2">🔗</Text>
                      <Text className="text-sky-700 font-semibold text-sm flex-1" numberOfLines={1}>
                        View Proof
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View className="mt-3 bg-amber-50 p-3 rounded-xl border border-amber-100 flex-row items-center">
                      <Text className="text-amber-600 mr-2">⚠️</Text>
                      <Text className="text-amber-700 font-semibold text-sm">No proof submitted</Text>
                    </View>
                  )}
                </Animated.View>
              );
            })}
            {pendingApprovals.length === 0 && (
              <Animated.Text entering={FadeInUp} className="text-slate-400 text-center py-4 font-medium">
                All caught up! No tasks pending approval.
              </Animated.Text>
            )}
          </View>
        )}

        {/* Quick Nav */}
        <View className="flex-row mb-4 space-x-3">
          <TouchableOpacity
            className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 items-center mr-1"
            onPress={() => router.push('/(parent)/analytics')}
          >
            <Text className="text-2xl mb-1">📊</Text>
            <Text className="text-indigo-600 font-bold text-sm">Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 items-center ml-1"
            onPress={() => router.push('/(parent)/rewards')}
          >
            <Text className="text-2xl mb-1">🏆</Text>
            <Text className="text-indigo-600 font-bold text-sm">Rewards</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <TouchableOpacity 
          className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 items-center border-dashed mb-4"
          onPress={() => router.push('/(parent)/create-task')}
        >
          <Text className="text-indigo-600 font-bold text-lg">+ Assign New Task</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
