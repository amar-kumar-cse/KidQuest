import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../../services/authService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AVATARS = ['🦸', '🧙', '🦊', '🐯', '🦁', '🐉', '🚀', '⚡'];

export default function RegisterKidScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    const trimName = name.trim();
    const trimEmail = email.trim().toLowerCase();
    const trimPass = password.trim();
    const parsedAge = age ? parseInt(age, 10) : undefined;

    if (!trimName || !trimEmail || !trimPass) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!EMAIL_REGEX.test(trimEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (trimPass.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (parsedAge !== undefined && (isNaN(parsedAge) || parsedAge < 3 || parsedAge > 17)) {
      setError('Please enter a valid age between 3 and 17.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authService.registerKid(trimEmail, trimPass, trimName, parsedAge);
      // After registration, go to kid dashboard (will prompt to enter family code)
      router.replace('/(kid)/mission-board');
    } catch (err: unknown) {
      setError(authService.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-yellow-50"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className="px-8"
      >
        <TouchableOpacity onPress={() => router.back()} className="pt-16 mb-2 self-start">
          <Text className="text-yellow-700 font-bold">← Back</Text>
        </TouchableOpacity>

        <View className="mb-6 mt-4">
          <Text className="text-4xl font-black text-yellow-900">Kid Account 🚀</Text>
          <Text className="text-yellow-700 mt-2">
            Create your quest profile!
          </Text>
        </View>

        {/* Avatar picker */}
        <View className="mb-6">
          <Text className="text-sm font-bold text-yellow-800 mb-3">Pick Your Avatar</Text>
          <View className="flex-row flex-wrap gap-3">
            {AVATARS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => setAvatar(emoji)}
                className={`w-14 h-14 rounded-2xl items-center justify-center ${
                  avatar === emoji
                    ? 'bg-yellow-400 border-2 border-yellow-600'
                    : 'bg-white border border-slate-200'
                }`}
              >
                <Text className="text-2xl">{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {error ? (
          <View className="bg-red-50 border border-red-200 p-3 rounded-xl mb-4">
            <Text className="text-red-700 font-medium">{error}</Text>
          </View>
        ) : null}

        <View className="space-y-4">
          <View>
            <Text className="text-sm font-bold text-yellow-800 mb-1.5">Your Name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Aryan"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              className="bg-white border-2 border-yellow-200 rounded-xl p-4 text-slate-800 text-base"
            />
          </View>
          <View>
            <Text className="text-sm font-bold text-yellow-800 mb-1.5">Age (optional)</Text>
            <TextInput
              value={age}
              onChangeText={setAge}
              placeholder="e.g. 10"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              className="bg-white border-2 border-yellow-200 rounded-xl p-4 text-slate-800 text-base"
            />
          </View>
          <View>
            <Text className="text-sm font-bold text-yellow-800 mb-1.5">Email *</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="kid@example.com"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="email-address"
              className="bg-white border-2 border-yellow-200 rounded-xl p-4 text-slate-800 text-base"
            />
          </View>
          <View>
            <Text className="text-sm font-bold text-yellow-800 mb-1.5">Password *</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 6 characters"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              className="bg-white border-2 border-yellow-200 rounded-xl p-4 text-slate-800 text-base"
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          className={`bg-green-500 border-b-4 border-green-600 py-4 rounded-2xl items-center mt-8 mb-6 ${loading ? 'opacity-60' : ''}`}
        >
          <Text className="text-white font-black text-lg">
            {loading ? 'Creating...' : "LET'S GO! 🚀"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
