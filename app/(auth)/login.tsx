import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { getFirebaseErrorMessage } from '../../lib/firestoreService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const [role, setRole] = useState<'kid' | 'parent' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const switchRole = (newRole: 'kid' | 'parent') => {
    setRole(newRole);
    setError(''); // Clear errors when switching role
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter both email and password.');
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      const uid = userCredential.user.uid;

      // Verify role from Firestore — never trust client-side role selection alone
      const userSnap = await getDoc(doc(db, 'Users', uid));
      const firestoreRole = userSnap.exists() ? userSnap.data().role : null;

      if (role === 'kid' || firestoreRole === 'kid') {
        router.replace('/(kid)/mission-board');
      } else {
        router.replace('/(parent)/dashboard');
      }
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!role) {
    return (
      <View className="flex-1 bg-indigo-50 justify-center items-center px-6">
        <View className="items-center mb-16">
          <Text className="text-5xl font-extrabold text-indigo-900 tracking-tight">KidQuest</Text>
          <Text className="text-lg text-indigo-500 mt-2 font-medium">Your child's growth, our peace of mind.</Text>
        </View>
        
        <Text className="text-2xl font-bold text-gray-700 mb-8">Who is opening the app?</Text>
        
        <View className="w-full flex-row space-x-4 justify-between">
          <TouchableOpacity 
            onPress={() => switchRole('kid')}
            className="flex-1 bg-yellow-400 p-8 rounded-3xl shadow-lg border-b-8 border-yellow-500 items-center m-2"
          >
            <Text className="text-6xl mb-4">🚀</Text>
            <Text className="text-2xl font-black text-yellow-900">Kid</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => switchRole('parent')}
            className="flex-1 bg-slate-800 p-8 rounded-2xl shadow-xl items-center m-2"
          >
            <Text className="text-6xl mb-4">🛡️</Text>
            <Text className="text-2xl font-bold text-slate-100">Parent</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      className={`flex-1 justify-center px-8 ${role === 'kid' ? 'bg-amber-100' : 'bg-slate-50'}`}
    >
      <TouchableOpacity onPress={() => setRole(null)} className="absolute top-16 left-6 z-10 p-2">
        <Text className="text-lg font-bold text-indigo-600">← Back</Text>
      </TouchableOpacity>

      <View className="mb-6 mt-12 items-center">
        <Text className={`text-4xl font-extrabold ${role === 'kid' ? 'text-amber-600' : 'text-slate-800'}`}>
          {role === 'kid' ? "Let's Play!" : "Welcome back"}
        </Text>
        <Text className={`text-lg mt-2 ${role === 'kid' ? 'text-amber-800 font-bold' : 'text-slate-500'}`}>
          {role === 'kid' ? 'Login to start your daily quests' : 'Sign in to access the control center'}
        </Text>
      </View>

      {error ? (
        <View className="bg-red-100 p-3 rounded-xl mb-4 border border-red-300">
          <Text className="text-red-800 text-center font-semibold">{error}</Text>
        </View>
      ) : null}

      <View className="space-y-4 mb-8">
        <View>
          <Text className={`text-sm font-semibold mb-1 ml-1 ${role === 'kid' ? 'text-amber-800' : 'text-slate-600'}`}>Email or Phone</Text>
          <TextInput
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            className={`w-full p-4 rounded-xl text-lg ${role === 'kid' ? 'bg-white border-4 border-amber-300 shadow-sm font-bold placeholder:text-amber-200 text-amber-900' : 'bg-white border border-slate-200 shadow-sm placeholder:text-slate-300'}`}
            autoCapitalize="none"
          />
        </View>
        <View>
          <Text className={`text-sm font-semibold mb-1 ml-1 ${role === 'kid' ? 'text-amber-800' : 'text-slate-600'}`}>Password</Text>
          <TextInput
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            className={`w-full p-4 rounded-xl text-lg ${role === 'kid' ? 'bg-white border-4 border-amber-300 shadow-sm font-bold placeholder:text-amber-200 text-amber-900' : 'bg-white border border-slate-200 shadow-sm placeholder:text-slate-300'}`}
          />
        </View>
      </View>

      <TouchableOpacity 
        onPress={handleLogin}
        disabled={loading}
        className={`w-full p-4 rounded-2xl items-center ${loading ? 'opacity-70' : ''} ${role === 'kid' ? 'bg-green-500 border-b-8 border-green-600 shadow-lg' : 'bg-indigo-600 shadow-md'}`}
      >
        <Text className={`text-xl ${role === 'kid' ? 'text-white font-black' : 'text-white font-bold'}`}>
          {loading ? 'LOADING...' : (role === 'kid' ? 'START ADVENTURE' : 'Access Dashboard')}
        </Text>
      </TouchableOpacity>

    </KeyboardAvoidingView>
  );
}
