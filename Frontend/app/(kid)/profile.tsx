import { useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../../lib/firebase';
import { authService } from '../../services/authService';
import { useKidProfile } from '../../hooks/useKidProfile';
import { familyService } from '../../services/familyService';
import { userService } from '../../services/userService';
import { XPBar } from '../../components/ui/XPBar';
import { StreakBadge } from '../../components/ui/StreakBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAppStore } from '../../store/useAppStore';

const AVATARS = ['🦸', '🧙', '🦊', '🐯', '🦁', '🐉', '🚀', '⚡'];

export default function KidProfileScreen() {
  const router = useRouter();
  const kidId = auth.currentUser?.uid;
  const { profile, isLoading, xpProgress } = useKidProfile(kidId);
  const { clearStore } = useAppStore();
  const [familyCode, setFamilyCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);

  const handleAvatarChange = async (emoji: string) => {
    if (!kidId) return;
    try {
      await userService.updateProfile(kidId, { avatarEmoji: emoji });
    } catch { Alert.alert('Error', 'Could not update avatar.'); }
  };

  const handleLinkFamily = async () => {
    if (!familyCode.trim() || familyCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-character family code.');
      return;
    }
    setLinking(true);
    try {
      const result = await familyService.verifyAndLinkFamilyCode(familyCode.trim());
      Alert.alert('🎉 Linked!', `You are now connected to ${result.parentName}!`);
      setShowCodeInput(false);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Invalid or expired code.');
    } finally { setLinking(false); }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => { authService.logout(); clearStore(); } },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action CANNOT be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await authService.deleteAccount();
              clearStore();
              router.replace('/(auth)/login');
            } catch (err: any) {
              Alert.alert('Error', authService.getErrorMessage(err));
            }
          }
        },
      ]
    );
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView className="flex-1 bg-amber-50">
      <ScrollView className="flex-1 px-6 pt-8" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="text-3xl font-black text-yellow-900 mb-6">My Profile 👤</Text>

        {/* Avatar */}
        <View className="items-center mb-6">
          <View className="w-24 h-24 bg-yellow-300 rounded-3xl items-center justify-center mb-4">
            <Text className="text-5xl">{profile?.avatarEmoji ?? '🦸'}</Text>
          </View>
          <Text className="text-xl font-black text-yellow-900">{profile?.name}</Text>
          {profile?.age && <Text className="text-slate-400 text-sm">Age {profile.age}</Text>}
        </View>

        {/* Avatar picker */}
        <View className="bg-white rounded-2xl p-4 border border-slate-100 mb-4">
          <Text className="text-sm font-bold text-slate-600 mb-3">Change Avatar</Text>
          <View className="flex-row flex-wrap gap-2">
            {AVATARS.map((e) => (
              <TouchableOpacity key={e} onPress={() => handleAvatarChange(e)}
                className={`w-12 h-12 rounded-xl items-center justify-center ${profile?.avatarEmoji === e ? 'bg-yellow-400' : 'bg-slate-50'}`}>
                <Text className="text-2xl">{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* XP Bar */}
        {profile && (
          <View className="bg-indigo-600 rounded-2xl p-4 mb-4">
            <XPBar current={xpProgress.current} required={xpProgress.required} level={xpProgress.level} totalXp={profile.totalXp} />
          </View>
        )}

        {/* Family code linking */}
        {!profile?.linkedParentId && (
          <View className="bg-amber-100 border border-amber-200 rounded-2xl p-4 mb-4">
            <Text className="text-amber-800 font-bold mb-2">🔗 Link to Parent</Text>
            <Text className="text-amber-600 text-sm mb-3">Enter the 6-character code from your parent's settings.</Text>
            {showCodeInput ? (
              <View>
                <TextInput value={familyCode} onChangeText={(t) => setFamilyCode(t.toUpperCase())} placeholder="ABC123" placeholderTextColor="#9CA3AF" maxLength={6} autoCapitalize="characters" className="bg-white border border-amber-200 rounded-xl p-3 text-center text-2xl font-black tracking-widest mb-3" />
                <TouchableOpacity onPress={handleLinkFamily} disabled={linking} className="bg-amber-500 py-3 rounded-xl items-center">
                  <Text className="text-white font-black">{linking ? 'Linking...' : 'Link Family 🔗'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setShowCodeInput(true)} className="bg-amber-500 py-3 rounded-xl items-center">
                <Text className="text-white font-bold">Enter Family Code</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {profile?.linkedParentId && (
          <View className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 flex-row items-center">
            <Text className="text-2xl mr-3">✅</Text>
            <Text className="text-green-700 font-bold">Linked to Parent</Text>
          </View>
        )}

        <TouchableOpacity onPress={handleLogout} className="bg-red-50 border border-red-200 py-4 rounded-2xl items-center mt-4 mb-2">
          <Text className="text-red-600 font-bold">Log Out</Text>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity onPress={handleDeleteAccount} className="py-4 items-center mb-8">
          <Text className="text-red-400 font-bold text-sm">Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
