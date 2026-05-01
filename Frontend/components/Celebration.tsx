import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

// Celebration component with haptic + sound + confetti + lottie.
// Props:
// - play: whether to play
// - soundAsset: optional local require(...) sound asset
// - onComplete: callback when celebration ends

export default function Celebration({ play = true, soundAsset, onComplete }: { play?: boolean; soundAsset?: any; onComplete?: () => void }) {
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let mounted = true;

    // Haptic feedback (best-effort)
    try {
      Haptics.selectionAsync();
    } catch (e) {
      // ignore
    }

    // Play sound if provided
    (async () => {
      if (!soundAsset) return;
      try {
        const { sound } = await Audio.Sound.createAsync(soundAsset);
        soundRef.current = sound;
        await sound.playAsync();
      } catch (e) {
        console.warn('Celebration sound failed', e);
      }
    })();

    // Cleanup after 3.5s and call onComplete
    const t = setTimeout(() => {
      if (mounted) onComplete && onComplete();
    }, 3500);

    return () => {
      mounted = false;
      clearTimeout(t);
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, [soundAsset]);

  return (
    <View style={styles.container} pointerEvents="none">
      {play && (
        <LottieView source={require('../assets/lottie/celebration.json')} autoPlay loop={false} style={styles.lottie} />
      )}
      {play && <ConfettiCannon count={120} origin={{ x: -10, y: 0 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  lottie: {
    width: 300,
    height: 300,
  },
});
