import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../../services/authService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterParentScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    const trimName = name.trim();
    const trimEmail = email.trim().toLowerCase();
    const trimPass = password.trim();

    if (!trimName || !trimEmail || !trimPass || !confirmPassword.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (trimName.length < 2) {
      setError('Name must be at least 2 characters.');
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
    if (trimPass !== confirmPassword.trim()) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authService.registerParent(trimEmail, trimPass, trimName);
      router.replace('/(parent)/dashboard');
    } catch (err: unknown) {
      setError(authService.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className="px-8"
      >
        <TouchableOpacity onPress={() => router.back()} className="pt-16 mb-2 self-start">
          <Text className="text-indigo-600 font-bold">← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View className="mb-8 mt-4">
          <Text className="text-4xl font-black text-slate-800">Parent Account</Text>
          <Text className="text-slate-400 mt-2">
            Set up your family's KidQuest account
          </Text>
        </View>

        {/* Error banner */}
        {error ? (
          <View className="bg-red-50 border border-red-200 p-3 rounded-xl mb-4">
            <Text className="text-red-700 font-medium">{error}</Text>
          </View>
        ) : null}

        {/* Form */}
        <View className="space-y-4">
          {[
            { label: 'Your Name', value: name, setter: setName, placeholder: 'e.g. Priya Sharma', secure: false, kb: 'default' as const },
            { label: 'Email Address', value: email, setter: setEmail, placeholder: 'parent@example.com', secure: false, kb: 'email-address' as const },
            { label: 'Password', value: password, setter: setPassword, placeholder: 'Min. 6 characters', secure: true, kb: 'default' as const },
            { label: 'Confirm Password', value: confirmPassword, setter: setConfirmPassword, placeholder: 'Re-enter password', secure: true, kb: 'default' as const },
          ].map((field) => (
            <View key={field.label}>
              <Text className="text-sm font-semibold text-slate-600 mb-1.5">{field.label}</Text>
              <TextInput
                value={field.value}
                onChangeText={field.setter}
                placeholder={field.placeholder}
                placeholderTextColor="#9CA3AF"
                secureTextEntry={field.secure}
                keyboardType={field.kb}
                autoCapitalize={field.kb === 'email-address' ? 'none' : 'words'}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 text-base"
              />
            </View>
          ))}
        </View>

        <Text className="text-xs text-slate-400 mt-6 text-center px-4">
          By registering, you agree to our Terms of Service and Privacy Policy. We collect data solely for family tracking purposes.
        </Text>

        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          className={`bg-indigo-600 py-4 rounded-2xl items-center mt-8 mb-6 ${loading ? 'opacity-60' : ''}`}
        >
          <Text className="text-white font-black text-lg">
            {loading ? 'Creating Account...' : 'Create Parent Account 🛡️'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
