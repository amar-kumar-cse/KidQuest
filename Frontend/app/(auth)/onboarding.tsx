import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { db, functions } from '../../lib/firebase';
import { useAppStore } from '../../store/useAppStore';
import { httpsCallable } from 'firebase/functions';

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, userRole, setRole, setKidProfile, setParentProfile } = useAppStore();
  
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<'parent' | 'kid' | null>(null);
  const [familyCode, setFamilyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  const handleSelectRole = (role: 'parent' | 'kid') => {
    setSelectedRole(role);
    setStep(2);
  };

  const completeOnboarding = async (finalRole: 'parent' | 'kid') => {
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'Users', user.uid), {
        role: finalRole,
        hasCompletedOnboarding: true,
      });

      setRole(finalRole);
      
      // Layout will automatically redirect because hasCompletedOnboarding changes 
      // when we fetch updated profile, but we can forcefully navigate here too.
      if (finalRole === 'parent') {
        router.replace('/(parent)/dashboard');
      } else {
        router.replace('/(kid)/mission-board');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to complete onboarding.');
    } finally {
      setLoading(false);
    }
  };

  const handleParentSetup = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Parents automatically get a family generated if they don't have one, but we can also
      // pre-generate a family code here to show them.
      const generateCodeFn = httpsCallable<any, { success: boolean; code: string }>(functions, 'generateFamilyCode');
      const res = await generateCodeFn({});
      setGeneratedCode(res.data.code);
      setStep(3);
    } catch (err: any) {
      console.error(err);
      // Even if code generation fails, we can let them into the app to do it later.
      Alert.alert('Notice', 'Could not generate code right now, but you can do it later in the app.');
      completeOnboarding('parent');
    } finally {
      setLoading(false);
    }
  };

  const handleKidSetup = async () => {
    if (!user) return;
    if (!familyCode.trim()) {
      Alert.alert('Error', 'Please enter a family code.');
      return;
    }
    setLoading(true);
    try {
      const verifyCodeFn = httpsCallable<{ code: string }, { success: boolean; parentId: string }>(functions, 'verifyFamilyCode');
      await verifyCodeFn({ code: familyCode.trim().toUpperCase() });
      Alert.alert('Success!', 'You are now linked to your family!');
      completeOnboarding('kid');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Invalid Code', err?.message || 'The code entered is invalid or expired.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          
          {step === 1 && (
            <View className="items-center">
              <Text className="text-4xl font-bold text-white mb-2">Welcome to KidQuest! 🚀</Text>
              <Text className="text-lg text-slate-300 text-center mb-10">Who is using this device?</Text>

              <TouchableOpacity 
                className="w-full bg-indigo-500 rounded-xl p-5 mb-4 flex-row items-center"
                onPress={() => handleSelectRole('parent')}
              >
                <Text className="text-4xl mr-4">👩‍👧</Text>
                <View>
                  <Text className="text-xl font-bold text-white">I am a Parent</Text>
                  <Text className="text-indigo-100 mt-1">I want to set tasks and rewards</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                className="w-full bg-emerald-500 rounded-xl p-5 flex-row items-center"
                onPress={() => handleSelectRole('kid')}
              >
                <Text className="text-4xl mr-4">👦</Text>
                <View>
                  <Text className="text-xl font-bold text-white">I am a Kid</Text>
                  <Text className="text-emerald-100 mt-1">I want to complete quests and earn XP</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && selectedRole === 'parent' && (
            <View className="items-center">
              <Text className="text-3xl font-bold text-white mb-4">Parent Setup 🛡️</Text>
              <Text className="text-slate-300 text-center mb-8 text-lg">
                As a parent, you will manage tasks, approve completed work, and set up rewards. 
                Let's generate your first Family Code so your kid can link their device.
              </Text>
              
              <TouchableOpacity 
                className="w-full bg-indigo-500 rounded-xl p-4 items-center mb-4"
                onPress={handleParentSetup}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Generate Family Code</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => completeOnboarding('parent')}>
                <Text className="text-slate-400 mt-4 underline text-lg">Skip for now</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 3 && selectedRole === 'parent' && (
            <View className="items-center">
              <Text className="text-3xl font-bold text-white mb-4">Your Family Code</Text>
              <View className="bg-slate-800 rounded-2xl p-8 mb-8 border border-slate-700 w-full items-center">
                <Text className="text-5xl font-mono font-bold text-emerald-400 tracking-widest">{generatedCode}</Text>
              </View>
              <Text className="text-slate-300 text-center mb-8 text-lg">
                Enter this code on your kid's device to link their account to yours. 
                This code expires in 24 hours.
              </Text>
              <TouchableOpacity 
                className="w-full bg-emerald-500 rounded-xl p-4 items-center"
                onPress={() => completeOnboarding('parent')}
              >
                <Text className="text-white font-bold text-lg">Get Started</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && selectedRole === 'kid' && (
            <View className="items-center">
              <Text className="text-3xl font-bold text-white mb-4">Kid Setup 🎮</Text>
              <Text className="text-slate-300 text-center mb-8 text-lg">
                Ask your parent for the Family Code and enter it below to join the quest!
              </Text>
              
              <TextInput
                className="bg-slate-800 text-white p-4 rounded-xl text-center text-3xl font-mono tracking-widest uppercase mb-8 border border-slate-700 w-full"
                placeholder="XXXXXX"
                placeholderTextColor="#64748b"
                value={familyCode}
                onChangeText={setFamilyCode}
                maxLength={6}
                autoCapitalize="characters"
              />
              
              <TouchableOpacity 
                className={`w-full rounded-xl p-4 items-center ${familyCode.length === 6 ? 'bg-emerald-500' : 'bg-slate-700'}`}
                onPress={handleKidSetup}
                disabled={loading || familyCode.length !== 6}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Join Family</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep(1)}>
                <Text className="text-slate-400 mt-8 underline text-lg">Back</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
