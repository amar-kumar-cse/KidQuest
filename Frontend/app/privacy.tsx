import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../services/authService';
import { useAppStore } from '../store/useAppStore';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { clearStore } = useAppStore();

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? All data including tasks, rewards, and linked kids will be erased. This action CANNOT be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.deleteAccount();
              clearStore();
              router.replace('/(auth)/login');
            } catch (err: any) {
              Alert.alert('Error', authService.getErrorMessage(err));
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="px-6 pt-8 pb-20">
        <View className="flex-row items-center mb-8">
          <TouchableOpacity onPress={() => router.back()} className="p-2 mr-2">
            <Text className="text-indigo-600 font-bold text-lg">← Back</Text>
          </TouchableOpacity>
          <Text className="text-2xl font-black text-slate-800">Privacy & Terms</Text>
        </View>

        <View className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-6">
          <Text className="text-lg font-bold text-slate-800 mb-2">1. Information Collection</Text>
          <Text className="text-slate-500 mb-4 leading-6">
            KidQuest collects minimal personal data required for account functionality (such as name and email). We comply with COPPA (Children's Online Privacy Protection Act) by requiring verified parental consent before a child account can be linked to the platform.
          </Text>

          <Text className="text-lg font-bold text-slate-800 mb-2">2. Data Usage</Text>
          <Text className="text-slate-500 mb-4 leading-6">
            The data collected is used strictly to provide the core functionality of the KidQuest app (XP tracking, task management, and family coordination). We do NOT sell, rent, or trade your personal information to third parties under any circumstances.
          </Text>

          <Text className="text-lg font-bold text-slate-800 mb-2">3. Data Retention & Deletion</Text>
          <Text className="text-slate-500 mb-4 leading-6">
            Users have the absolute right to delete their accounts at any time. When an account is deleted, all associated data, including task history, pending rewards, and uploaded proof images, are permanently erased from our active servers.
          </Text>

          <Text className="text-lg font-bold text-slate-800 mb-2">4. Parental Rights</Text>
          <Text className="text-slate-500 leading-6">
            Parents maintain full control over their children's accounts. A parent can unlink or delete a child's account at any point via the parent dashboard settings.
          </Text>
        </View>

        <Text className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">Account Actions</Text>
        <View className="bg-red-50 rounded-3xl p-6 border border-red-100 shadow-sm mb-10 items-center">
          <Text className="text-red-800 font-bold mb-2 text-center">Danger Zone</Text>
          <Text className="text-red-600 text-sm mb-4 text-center">
            Deleting your account will erase everything. Ensure you have backed up any necessary information before proceeding.
          </Text>
          <TouchableOpacity 
            className="bg-red-500 px-6 py-3 rounded-xl w-full items-center shadow-md"
            onPress={handleDeleteAccount}
          >
            <Text className="text-white font-black">Permanently Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
