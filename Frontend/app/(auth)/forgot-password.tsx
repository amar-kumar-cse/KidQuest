import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../../services/authService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    const trimEmail = email.trim().toLowerCase();
    if (!trimEmail || !EMAIL_REGEX.test(trimEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.resetPassword(trimEmail);
      setSent(true);
    } catch (err: unknown) {
      setError(authService.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white px-8 justify-center"
    >
      <TouchableOpacity onPress={() => router.back()} className="absolute top-16 left-6">
        <Text className="text-indigo-600 font-bold">← Back</Text>
      </TouchableOpacity>

      {sent ? (
        <View className="items-center">
          <Text className="text-6xl mb-4">📬</Text>
          <Text className="text-2xl font-black text-slate-800 mb-3">Email Sent!</Text>
          <Text className="text-slate-500 text-center leading-6 mb-8">
            Check your inbox at{' '}
            <Text className="font-bold text-indigo-600">{email}</Text> for the
            password reset link.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            className="bg-indigo-600 px-8 py-4 rounded-2xl"
          >
            <Text className="text-white font-bold text-base">Back to Login</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Text className="text-4xl font-black text-slate-800 mb-2">Forgot Password?</Text>
          <Text className="text-slate-400 mb-8">
            Enter your email and we'll send you a reset link.
          </Text>

          {error ? (
            <View className="bg-red-50 border border-red-200 p-3 rounded-xl mb-4">
              <Text className="text-red-700 font-medium">{error}</Text>
            </View>
          ) : null}

          <Text className="text-sm font-semibold text-slate-600 mb-1.5">Email Address</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 text-base mb-6"
          />

          <TouchableOpacity
            onPress={handleReset}
            disabled={loading}
            className={`bg-indigo-600 py-4 rounded-2xl items-center ${loading ? 'opacity-60' : ''}`}
          >
            <Text className="text-white font-bold text-base">
              {loading ? 'Sending...' : 'Send Reset Link 📬'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
