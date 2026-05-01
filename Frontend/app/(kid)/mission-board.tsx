import {
  View, Text, TouchableOpacity, ScrollView, SafeAreaView,
  ActivityIndicator, Modal, Alert, Image, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { taskService } from '../../services/taskService';
import { authService } from '../../services/authService';
import { useAppStore } from '../../store/useAppStore';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import MissionCard from '../../components/MissionCard';
import KidQuestLogo from '../../components/KidQuestLogo';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useKidTasks } from '../../hooks/useTasks';
import type { Task } from '../../types';
import Animated, { FadeInRight, FadeInLeft, Layout } from 'react-native-reanimated';

interface Quest {
  id: string;
  title: string;
  xp: number;
  completed: boolean;
  icon: string;
  category: string;
  description: string;
}
// Force Metro reload
export default function MissionBoard() {
  const router = useRouter();
  const { kidProfile } = useAppStore();
  const kidName = kidProfile?.name || 'Kid';

  const { pendingTasks: quests, submittedTasks: waitingApproval, isLoading: loading } = useKidTasks(auth.currentUser?.uid);

  // Proof submission modal state
  const [proofModalVisible, setProofModalVisible] = useState(false);
  const [proofImageUri, setProofImageUri] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [selectedQuest, setSelectedQuest] = useState<Task | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Image Picker helpers ───────────────────────────────────────────
  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setProofImageUri(result.assets[0].uri);
    }
  };

  const takePhotoWithCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your camera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setProofImageUri(result.assets[0].uri);
    }
  };

  const openProofModal = (quest: Task) => {
    setSelectedQuest(quest);
    setProofImageUri(null);
    setUploadPercent(null);
    setProofModalVisible(true);
  };

  const handleSubmitProof = async () => {
    if (!selectedQuest) return;
    setSubmitting(true);
    setUploadPercent(0);
    try {
      await taskService.submitProof(selectedQuest.id, proofImageUri ?? '');
      setProofModalVisible(false);
      setSelectedQuest(null);
      setProofImageUri(null);
      setUploadPercent(null);
    } catch (err: any) {
      console.error('Error completing task:', err);
      Alert.alert('Error', authService.getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickComplete = (quest: Task) => {
    Alert.alert(
      '⚔️ Complete Quest',
      `Mark "${quest.title}" as done?\n\nYou can attach a photo as proof!`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '📸 With Photo Proof', onPress: () => openProofModal(quest) },
        {
          text: '✅ Quick Complete',
          onPress: async () => {
            try {
              await taskService.submitProof(quest.id, '');
            } catch (err: any) {
              Alert.alert('Error', authService.getErrorMessage(err));
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#E1F1F8]">
      {/* Header Bar */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <TouchableOpacity
          className="w-10 h-10 bg-white rounded-xl items-center justify-center shadow-sm"
          onPress={() => router.replace('/(auth)/login')}
        >
          <KidQuestLogo width={24} height={24} showText={false} showTagline={false} />
        </TouchableOpacity>

        <Text className="text-lg font-black text-[#000080]">
          {kidName ? `${kidName}'s Quests` : 'Quest Map'}
        </Text>

        <TouchableOpacity className="w-10 h-10 bg-white rounded-xl items-center justify-center shadow-sm">
          <Ionicons name="notifications-outline" size={20} color="#000080" />
        </TouchableOpacity>
      </View>

      <ScrollView className="px-6 flex-1">
        {/* Quick Nav */}
        <View className="flex-row mb-4 space-x-2">
          <TouchableOpacity
            className="flex-1 bg-white py-3 rounded-xl border border-sky-100 items-center mr-1"
            onPress={() => router.push('/(kid)/vault')}
          >
            <Text className="text-sm font-bold text-[#000080]">💎 Vault</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-white py-3 rounded-xl border border-sky-100 items-center mx-1"
            onPress={() => router.push('/(kid)/stats')}
          >
            <Text className="text-sm font-bold text-[#000080]">🏅 Stats</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-white py-3 rounded-xl border border-sky-100 items-center ml-1"
            onPress={() => router.push('/(kid)/focus-mode')}
          >
            <Text className="text-sm font-bold text-[#000080]">🎯 Focus</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <SkeletonLoader rows={5} rowHeight={72} style={{ marginTop: 8 }} />
        ) : quests.length === 0 && waitingApproval.length === 0 ? (
          <View className="bg-white p-8 rounded-3xl mt-4 border border-sky-100 shadow-sm items-center">
            <Text className="text-5xl mb-4">🎉</Text>
            <Text className="text-xl font-bold text-[#000080] text-center">You did it all!</Text>
            <Text className="text-sky-600 mt-2 text-center">
              No more quests for today. Relax and enjoy!
            </Text>
          </View>
        ) : (
          <View className="space-y-6 pb-20">
            {/* Yellow path */}
            <View className="absolute left-[30px] top-6 bottom-0 w-2 bg-[#FFD700] rounded-full z-0 opacity-50" />

            {/* Active Quests */}
            {quests.map((quest, index) => (
              <Animated.View 
                key={quest.id} 
                entering={FadeInRight.delay(index * 100).springify()}
                layout={Layout.springify()}
                className="relative z-10 w-full pl-6"
              >
                <View className="absolute left-[-16] top-1/2 mt-[-10] w-5 h-5 bg-[#FFD700] rounded-full border-4 border-white" />
                <MissionCard
                  title={quest.title}
                  type={quest.category || 'Mission'}
                  isRequired={true}
                  progress={0.2}
                  onPress={() => handleQuickComplete(quest)}
                />
              </Animated.View>
            ))}

            {/* Waiting for Approval */}
            {waitingApproval.length > 0 && (
              <Animated.View entering={FadeInLeft.delay(200)}>
                <Text className="text-lg font-bold text-[#000080] mt-4 ml-6 opacity-60">
                  ⏳ Waiting for Parent...
                </Text>
                {waitingApproval.map((quest, index) => (
                  <Animated.View 
                    key={quest.id} 
                    entering={FadeInRight.delay(index * 100 + 300).springify()}
                    layout={Layout.springify()}
                    className="relative z-10 w-full pl-6 opacity-60 mt-3"
                  >
                    <View className="absolute left-[-16] top-1/2 mt-[-10] w-5 h-5 bg-amber-400 rounded-full border-4 border-white" />
                    <View className="bg-white rounded-2xl p-4 shadow-sm border border-amber-200">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="text-base font-bold text-[#000080]">{quest.title}</Text>
                          <Text className="text-sm text-amber-600 font-semibold mt-1">
                            ⏳ Sent to parent for approval
                          </Text>
                        </View>
                        <View className="bg-amber-100 px-3 py-1 rounded-full">
                          <Text className="text-amber-700 font-bold text-xs">+{quest.xp} XP</Text>
                        </View>
                      </View>
                    </View>
                  </Animated.View>
                ))}
              </Animated.View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Proof Submission Modal ─────────────────────────────────────── */}
      <Modal
        visible={proofModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => !submitting && setProofModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-[#E1F1F8]">
          <View className="px-6 pt-8 flex-1">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between mb-6">
              <TouchableOpacity
                onPress={() => setProofModalVisible(false)}
                disabled={submitting}
              >
                <Text className="text-[#000080] font-bold text-lg">Cancel</Text>
              </TouchableOpacity>
              <Text className="text-xl font-black text-[#000080]">📸 Submit Proof</Text>
              <View className="w-16" />
            </View>

            {/* Quest Info */}
            {selectedQuest && (
              <View className="bg-white p-5 rounded-3xl border border-sky-100 shadow-sm mb-5">
                <Text className="text-xl font-black text-[#000080]">{selectedQuest.title}</Text>
                <Text className="text-base font-bold text-sky-600 mt-1">+{selectedQuest.xp} XP</Text>
                {selectedQuest.description ? (
                  <Text className="text-sm text-slate-500 mt-2">{selectedQuest.description}</Text>
                ) : null}
              </View>
            )}

            {/* Photo Picker Area */}
            <View className="bg-white rounded-3xl border border-sky-100 shadow-sm mb-5 overflow-hidden">
              {proofImageUri ? (
                <View>
                  <Image
                    source={{ uri: proofImageUri }}
                    className="w-full h-52"
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    className="p-3 items-center bg-slate-50 border-t border-slate-100"
                    onPress={() => setProofImageUri(null)}
                    disabled={submitting}
                  >
                    <Text className="text-slate-500 font-semibold text-sm">🔄 Change Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="p-6">
                  <Text className="text-sm font-bold text-[#000080] mb-4 text-center">
                    Attach proof of your completed quest
                  </Text>
                  <View className="flex-row space-x-3">
                    <TouchableOpacity
                      className="flex-1 bg-sky-50 border border-sky-200 rounded-2xl py-5 items-center mr-2"
                      onPress={takePhotoWithCamera}
                      disabled={submitting}
                    >
                      <Text className="text-3xl mb-2">📷</Text>
                      <Text className="text-sm font-bold text-[#000080]">Take Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-1 bg-purple-50 border border-purple-200 rounded-2xl py-5 items-center ml-2"
                      onPress={pickImageFromGallery}
                      disabled={submitting}
                    >
                      <Text className="text-3xl mb-2">🖼️</Text>
                      <Text className="text-sm font-bold text-[#000080]">From Gallery</Text>
                    </TouchableOpacity>
                  </View>
                  <Text className="text-xs text-slate-400 mt-3 text-center">
                    Optional — tap "Quick Submit" below to skip photo proof
                  </Text>
                </View>
              )}
            </View>

            {/* Upload progress bar */}
            {uploadPercent !== null && submitting && (
              <View className="mb-4 bg-white rounded-2xl p-4 border border-sky-100">
                <Text className="text-xs text-slate-500 mb-2">Uploading proof... {uploadPercent}%</Text>
                <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-sky-500 rounded-full"
                    style={{ width: `${uploadPercent}%` }}
                  />
                </View>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              className={`p-5 rounded-2xl items-center shadow-lg ${
                submitting ? 'bg-green-400' : 'bg-green-500'
              }`}
              onPress={handleSubmitProof}
              disabled={submitting}
            >
              <Text className="text-white font-black text-lg tracking-wide">
                {submitting
                  ? '⏳ Submitting...'
                  : proofImageUri
                  ? '✅ Submit with Photo!'
                  : '⚡ Quick Submit (No Photo)'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
