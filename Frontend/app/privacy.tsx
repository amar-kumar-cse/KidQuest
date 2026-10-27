import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../services/authService';
import { useAppStore } from '../store/useAppStore';
import { ParentalGateModal } from '../components/parent/ParentalGateModal';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { clearStore } = useAppStore();
  const [gateVisible, setGateVisible] = useState(false);

  const executeDelete = async () => {
    try {
      await authService.deleteAccount();
      clearStore();
      router.replace('/(auth)/login');
    } catch (err: any) {
      Alert.alert('Error', authService.getErrorMessage(err));
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? All data including tasks, rewards, and linked kids will be erased. This action CANNOT be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify Parent & Delete',
          style: 'destructive',
          onPress: () => setGateVisible(true),
        },
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
          <Text className="text-lg font-bold text-slate-800 mb-2">1. Children's Privacy (COPPA & DPDP Act)</Text>
          <Text className="text-slate-500 mb-4 leading-6">
            KidQuest complies with the Children's Online Privacy Protection Act (COPPA) and India's Digital Personal Data Protection Act (DPDP Act 2023). We never collect personally identifiable information from children without verified adult parental consent. Parents retain full visibility and authority over child profiles at all times.
          </Text>

          <Text className="text-lg font-bold text-slate-800 mb-2">2. Zero Third-Party Advertising & Tracking</Text>
          <Text className="text-slate-500 mb-4 leading-6">
            KidQuest contains ZERO third-party behavioral advertising, zero marketing trackers, and zero analytics sharing with external data brokers. We do not monetize children's data or attention.
          </Text>

          <Text className="text-lg font-bold text-slate-800 mb-2">3. Storage & Photo Privacy</Text>
          <Text className="text-slate-500 mb-4 leading-6">
            Photos uploaded as quest completion proof are strictly stored in authenticated, private cloud storage. Photos can only be accessed by the assigned child and their verified linked parent. Photos are never public, indexed, or shared.
          </Text>

          <Text className="text-lg font-bold text-slate-800 mb-2">4. Parental Rights & Data Deletion</Text>
          <Text className="text-slate-500 mb-4 leading-6">
            Parents have the right to review, update, export, or permanently delete any data associated with their family or children. You may initiate self-service deletion at any time from Settings or using the button below.
          </Text>

          <Text className="text-lg font-bold text-slate-800 mb-2">5. Data Retention Policy</Text>
          <Text className="text-slate-500 leading-6">
            Upon account deletion, all user profile records, tasks, proof images, XP transaction ledgers, and notification histories are queued and permanently purged from active production databases.
          </Text>
        </View>

        <Text className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1">Account Actions</Text>
        <View className="bg-red-50 rounded-3xl p-6 border border-red-100 shadow-sm mb-10 items-center">
          <Text className="text-red-800 font-bold mb-2 text-center">Danger Zone</Text>
          <Text className="text-red-600 text-sm mb-4 text-center">
            Deleting your account will erase everything. Ensure you have backed up any necessary information before proceeding.
          </Text>
          <TouchableOpacity 
            className="bg-red-500 px-6 py-3 rounded-xl w-full items-center shadow-md active:bg-red-600"
            onPress={handleDeleteAccount}
          >
            <Text className="text-white font-black">Permanently Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Parental Gate Modal for deletion */}
      <ParentalGateModal
        visible={gateVisible}
        title="Parent Verification 🛡️"
        reason="Please verify you are an adult before permanently deleting your account data."
        onSuccess={() => {
          setGateVisible(false);
          executeDelete();
        }}
        onCancel={() => setGateVisible(false)}
      />
    </SafeAreaView>
  );
}
