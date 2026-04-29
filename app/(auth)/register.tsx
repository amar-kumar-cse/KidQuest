import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function RegisterScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-center px-8">
      <TouchableOpacity
        onPress={() => router.back()}
        className="absolute top-16 left-6 p-2"
      >
        <Text className="text-indigo-600 font-bold text-base">← Back</Text>
      </TouchableOpacity>

      <Animated.View entering={FadeInDown.springify()} className="items-center mb-12">
        <Text className="text-4xl font-black text-slate-800">Join KidQuest</Text>
        <Text className="text-slate-500 mt-2 text-center">
          Who is creating an account?
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).springify()} className="space-y-4">
        {/* Parent option */}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/register-parent' as any)}
          className="bg-white border-2 border-indigo-100 rounded-3xl p-6 flex-row items-center shadow-sm active:bg-indigo-50"
        >
          <View className="w-16 h-16 bg-indigo-100 rounded-2xl items-center justify-center mr-4">
            <Text className="text-3xl">🛡️</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xl font-black text-slate-800">I'm a Parent</Text>
            <Text className="text-slate-400 text-sm mt-1">
              Create tasks, track progress, set rewards
            </Text>
          </View>
          <Text className="text-slate-300 text-xl">›</Text>
        </TouchableOpacity>

        {/* Kid option */}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/register-kid' as any)}
          className="bg-yellow-400 border-b-4 border-yellow-500 rounded-3xl p-6 flex-row items-center shadow-sm active:bg-yellow-500"
        >
          <View className="w-16 h-16 bg-yellow-300 rounded-2xl items-center justify-center mr-4">
            <Text className="text-3xl">🚀</Text>
          </View>
          <View className="flex-1">
            <Text className="text-xl font-black text-yellow-900">I'm a Kid</Text>
            <Text className="text-yellow-800 text-sm mt-1">
              Complete quests, earn XP, claim rewards
            </Text>
          </View>
          <Text className="text-yellow-700 text-xl">›</Text>
        </TouchableOpacity>
      </Animated.View>

      <View className="flex-row justify-center mt-10">
        <Text className="text-slate-400">Already have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text className="text-indigo-600 font-bold">Log In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
