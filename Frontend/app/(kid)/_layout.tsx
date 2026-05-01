import { Stack } from 'expo-router';

export default function KidLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="mission-board" />
      <Stack.Screen name="vault" />
      <Stack.Screen name="stats" />
      <Stack.Screen name="focus-mode" />
    </Stack>
  );
}
