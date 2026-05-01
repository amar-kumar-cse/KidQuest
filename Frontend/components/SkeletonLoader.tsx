import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────

interface SkeletonLoaderProps {
  /** Number of skeleton rows to render */
  rows?: number;
  /** Height of each row in px (default: 18) */
  rowHeight?: number;
  /** Optional outer container style */
  style?: ViewStyle;
}

// ─── SkeletonLoader ───────────────────────────────────────────────────

/**
 * Animated shimmer skeleton for loading states.
 * Drop this in wherever you'd normally show a blank screen while fetching data.
 *
 * Usage:
 *   {isLoading ? <SkeletonLoader rows={5} /> : <ActualContent />}
 */
export default function SkeletonLoader({
  rows = 4,
  rowHeight = 18,
  style,
}: SkeletonLoaderProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: rows }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              height: rowHeight,
              // Vary widths for a more natural look
              width: i % 3 === 0 ? '60%' : i % 3 === 1 ? '85%' : '75%',
              opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  bar: {
    backgroundColor: '#334155',
    borderRadius: 8,
  },
});
