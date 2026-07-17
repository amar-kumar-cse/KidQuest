import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

type CelebrationProps = {
  play?: boolean;
  onComplete?: () => void;
};

const confettiColors = ['#22C55E', '#F59E0B', '#0EA5E9', '#EF4444', '#8B5CF6'];

export default function Celebration({ play = true, onComplete }: CelebrationProps) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!play) return;

    try {
      Haptics.selectionAsync();
    } catch {
      // Best effort only.
    }

    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      onComplete?.();
    }, 2200);

    return () => clearTimeout(timer);
  }, [fade, onComplete, play, scale]);

  if (!play) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.burst,
          {
            opacity: fade,
            transform: [{ scale }],
          },
        ]}
      >
        {confettiColors.map((color, index) => (
          <View key={color + index} style={[styles.confetti, { backgroundColor: color }, positions[index]]} />
        ))}
      </Animated.View>
    </View>
  );
}

const positions = [
  { top: 6, left: 24, transform: [{ rotate: '18deg' }] },
  { top: 20, right: 18, transform: [{ rotate: '-14deg' }] },
  { bottom: 26, left: 10, transform: [{ rotate: '-32deg' }] },
  { bottom: 14, right: 14, transform: [{ rotate: '26deg' }] },
  { top: 42, left: 56, transform: [{ rotate: '8deg' }] },
];

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  burst: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  confetti: {
    position: 'absolute',
    width: 18,
    height: 10,
    borderRadius: 999,
  },
});
