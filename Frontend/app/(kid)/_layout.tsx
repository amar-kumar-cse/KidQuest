import { Stack } from 'expo-router';
import CelebrationOverlay from '../../components/CelebrationOverlay';

export default function KidLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="mission-board" />
        <Stack.Screen name="vault" />
        <Stack.Screen name="stats" />
        <Stack.Screen name="focus-mode" />
      </Stack>
      <CelebrationOverlay />
    </>
  );
}

