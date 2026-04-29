import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="register" />
      <Stack.Screen name="register-parent" />
      <Stack.Screen name="register-kid" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
