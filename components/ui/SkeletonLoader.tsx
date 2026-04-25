import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';

// ─── Single Skeleton Block ────────────────────────────────────────────

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBlock({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // infinite
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.35, 0.75]),
  }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: '#cbd5e1' },
        animatedStyle,
        style,
      ]}
    />
  );
}

// ─── Task Card Skeleton ───────────────────────────────────────────────

export function TaskCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <SkeletonBlock width={40} height={40} borderRadius={12} />
        <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
          <SkeletonBlock width="70%" height={14} />
          <SkeletonBlock width="45%" height={11} />
        </View>
        <SkeletonBlock width={48} height={24} borderRadius={12} />
      </View>
    </View>
  );
}

// ─── Dashboard Skeleton (3 task cards + header) ───────────────────────

export function DashboardSkeleton() {
  return (
    <View style={{ gap: 16, padding: 24 }}>
      {/* Header */}
      <SkeletonBlock width="55%" height={28} borderRadius={8} />
      <SkeletonBlock width="35%" height={14} borderRadius={8} />

      {/* Stats row */}
      <View style={styles.row}>
        <SkeletonBlock width="48%" height={80} borderRadius={16} />
        <View style={{ width: 12 }} />
        <SkeletonBlock width="46%" height={80} borderRadius={16} />
      </View>

      {/* Task cards */}
      <TaskCardSkeleton />
      <TaskCardSkeleton />
      <TaskCardSkeleton />
    </View>
  );
}

// ─── Profile Skeleton ─────────────────────────────────────────────────

export function ProfileSkeleton() {
  return (
    <View style={{ gap: 16, padding: 24, alignItems: 'center' }}>
      <SkeletonBlock width={80} height={80} borderRadius={40} />
      <SkeletonBlock width="50%" height={20} borderRadius={8} />
      <SkeletonBlock width="75%" height={14} borderRadius={8} />

      <View style={{ width: '100%', gap: 12, marginTop: 16 }}>
        <SkeletonBlock height={52} borderRadius={14} />
        <SkeletonBlock height={52} borderRadius={14} />
        <SkeletonBlock height={52} borderRadius={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
