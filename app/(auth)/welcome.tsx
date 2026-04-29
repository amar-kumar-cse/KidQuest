import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={['#4C3BCF', '#6C63FF', '#48BEFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="flex-1"
    >
      <SafeAreaView className="flex-1 px-8 justify-center">
        {/* Logo area */}
        <Animated.View entering={FadeInDown.delay(100).springify()} className="items-center mb-16">
          <Text className="text-7xl mb-4">🏆</Text>
          <Text className="text-5xl font-black text-white tracking-tight">KidQuest</Text>
          <Text className="text-white/80 text-center text-lg mt-3 leading-6">
            Complete tasks, earn XP,{'\n'}unlock awesome rewards!
          </Text>
        </Animated.View>

        {/* Feature pills */}
        <Animated.View entering={FadeInDown.delay(300).springify()} className="flex-row flex-wrap justify-center gap-2 mb-16">
          {['⭐ Earn XP', '🔥 Build Streaks', '🎁 Claim Rewards', '🏅 Earn Badges'].map((feat) => (
            <View key={feat} className="bg-white/20 px-4 py-2 rounded-full">
              <Text className="text-white font-semibold text-sm">{feat}</Text>
            </View>
          ))}
        </Animated.View>

        {/* CTA Buttons */}
        <Animated.View entering={FadeInUp.delay(500).springify()} className="space-y-3">
          <TouchableOpacity
            className="w-full bg-white rounded-2xl py-4 items-center shadow-lg active:scale-95"
            onPress={() => router.push('/(auth)/login')}
          >
            <Text className="text-indigo-600 font-black text-lg">Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="w-full border-2 border-white/60 rounded-2xl py-4 items-center active:bg-white/10"
            onPress={() => router.push('/(auth)/register' as any)}
          >
            <Text className="text-white font-bold text-lg">Create Account</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.Text
          entering={FadeInUp.delay(700)}
          className="text-white/50 text-center text-xs mt-8"
        >
          Built with ❤️ by Nowic Studio
        </Animated.Text>
      </SafeAreaView>
    </LinearGradient>
  );
}
