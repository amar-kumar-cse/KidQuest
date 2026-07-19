import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useNotifications } from '../hooks/useNotifications';
import { speak } from '../lib/tts';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Premium visual palette
const CONFETTI_COLORS = [
  '#FF6B6B',
  '#4DABF7',
  '#51CF66',
  '#FCC419',
  '#CC5DE8',
  '#FF922B',
  '#20C997',
  '#FF8787',
  '#74C0FC',
  '#63E6BE',
];

interface ConfettiParticle {
  id: number;
  color: string;
  size: number;
  shape: 'circle' | 'square' | 'triangle';
  startX: number;
  endX: number;
  duration: number;
  delay: number;
}

// Helper to generate random confetti configuration
const generateConfetti = (count: number): ConfettiParticle[] => {
  return Array.from({ length: count }).map((_, index) => {
    const startX = Math.random() * SCREEN_WIDTH;
    const endX = startX + (Math.random() * 200 - 100);
    const size = Math.random() * 10 + 8; // Size between 8 and 18
    const shapes: ('circle' | 'square' | 'triangle')[] = ['circle', 'square', 'triangle'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const duration = 2000 + Math.random() * 2000; // 2s to 4s
    const delay = Math.random() * 1500; // Staggered delays
    return {
      id: index,
      color,
      size,
      shape,
      startX,
      endX,
      duration,
      delay,
    };
  });
};

function ConfettiPiece({ particle }: { particle: ConfettiParticle }) {
  const posY = useSharedValue(-20);
  const posX = useSharedValue(particle.startX);
  const rotation = useSharedValue(0);

  useEffect(() => {
    posY.value = withDelay(
      particle.delay,
      withTiming(SCREEN_HEIGHT + 20, {
        duration: particle.duration,
        easing: Easing.linear,
      })
    );

    posX.value = withDelay(
      particle.delay,
      withTiming(particle.endX, {
        duration: particle.duration,
        easing: Easing.out(Easing.quad),
      })
    );

    rotation.value = withDelay(
      particle.delay,
      withTiming(360 * 3, {
        duration: particle.duration,
        easing: Easing.linear,
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: posX.value },
        { translateY: posY.value },
        { rotate: `${rotation.value}deg` },
      ],
    };
  });

  if (particle.shape === 'triangle') {
    return (
      <Animated.View
        style={[
          styles.confettiPiece,
          animatedStyle,
          {
            width: 0,
            height: 0,
            backgroundColor: 'transparent',
            borderStyle: 'solid',
            borderLeftWidth: particle.size / 2,
            borderRightWidth: particle.size / 2,
            borderBottomWidth: particle.size,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: particle.color,
          },
        ]}
      />
    );
  }

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        animatedStyle,
        {
          width: particle.size,
          height: particle.shape === 'square' ? particle.size : particle.size * 0.6,
          backgroundColor: particle.color,
          borderRadius: particle.shape === 'circle' ? particle.size / 2 : 2,
        },
      ]}
    />
  );
}

export default function CelebrationOverlay() {
  const { notifications, markAsRead } = useNotifications();
  const [confettiList, setConfettiList] = useState<ConfettiParticle[]>([]);
  const [displayedXp, setDisplayedXp] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);

  // Find the first unread task approval notification
  const activeNotif = notifications.find(
    (n) => !n.isRead && n.type === 'task_approved'
  );

  const xpValue = activeNotif?.xpAwarded ?? 50;

  // Spring animations for scale and opacity
  const cardScale = useSharedValue(0.3);
  const cardOpacity = useSharedValue(0);

  // Parse task title (e.g. from quotes in notification body)
  const getTaskTitle = (bodyText: string) => {
    const match = bodyText.match(/"([^"]+)"/);
    return match ? match[1] : 'Quest';
  };

  const taskTitle = activeNotif ? getTaskTitle(activeNotif.body) : 'Quest';

  useEffect(() => {
    if (activeNotif) {
      setIsDismissing(false);
      setConfettiList(generateConfetti(65));
      setDisplayedXp(0);

      // Bounce card in
      cardScale.value = withSpring(1, { damping: 11, stiffness: 85 });
      cardOpacity.value = withTiming(1, { duration: 400 });

      // TTS voice: "Amazing work, +50 XP!"
      try {
        speak(`Amazing work! Plus ${xpValue} XP!`, { pitch: 1.25, rate: 0.95 });
      } catch (err) {
        console.warn('[CelebrationOverlay] TTS failed:', err);
      }

      // Play major success haptic
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err) {
        console.warn('[CelebrationOverlay] Haptic success failed:', err);
      }

      // Animate XP counter
      let start = 0;
      const end = xpValue;
      const duration = 1200; // 1.2 seconds count up
      const startTime = performance.now();

      let lastTickValue = 0;

      const animateXp = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuad = progress * (2 - progress);
        const currentCount = Math.floor(easeOutQuad * end);

        setDisplayedXp(currentCount);

        // Soft haptic ticks while counting up
        if (currentCount > lastTickValue && currentCount % 2 === 0) {
          lastTickValue = currentCount;
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {
            // Ignore haptic failures
          }
        }

        if (progress < 1) {
          requestAnimationFrame(animateXp);
        }
      };

      requestAnimationFrame(animateXp);
    } else {
      setConfettiList([]);
      setDisplayedXp(0);
    }
  }, [activeNotif?.id, xpValue]);

  const handleDismiss = async () => {
    if (!activeNotif || isDismissing) return;
    setIsDismissing(true);

    // Play button click haptic
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // ignore
    }

    // Shrink and fade out card
    cardScale.value = withTiming(0.5, { duration: 250 });
    cardOpacity.value = withTiming(0, { duration: 200 });

    setTimeout(async () => {
      try {
        await markAsRead(activeNotif.id);
      } catch (err) {
        console.error('[CelebrationOverlay] Failed to mark read:', err);
      } finally {
        setIsDismissing(false);
      }
    }, 250);
  };

  if (!activeNotif) return null;

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      opacity: cardOpacity.value,
      transform: [{ scale: cardScale.value }],
    };
  });

  return (
    <Modal transparent animationType="none" visible={!!activeNotif}>
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Semi-transparent Backdrop */}
        <Animated.View style={[styles.backdrop]} />

        {/* Confetti Rain Container */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {confettiList.map((particle) => (
            <ConfettiPiece key={particle.id} particle={particle} />
          ))}
        </View>

        {/* Reward Card */}
        <Animated.View style={[styles.card, animatedCardStyle]}>
          {/* Trophy Header */}
          <View style={styles.trophyContainer}>
            <View style={styles.glowRing}>
              <Ionicons name="trophy" size={54} color="#FFD700" />
            </View>
          </View>

          {/* Texts */}
          <Text style={styles.headerText}>QUEST APPROVED! 🎉</Text>

          <View style={styles.badgeContainer}>
            <Text style={styles.questTitle} numberOfLines={2}>
              {taskTitle}
            </Text>
          </View>

          <Text style={styles.congratsText}>Amazing Job!</Text>

          {/* XP Display */}
          <View style={styles.xpBox}>
            <Text style={styles.xpText}>+{displayedXp} XP</Text>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.button}
            onPress={handleDismiss}
          >
            <Text style={styles.buttonText}>Claim XP! 🚀</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles: any = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.85)', // Sleek dark slate glassmorphism feel
  },
  confettiPiece: {
    position: 'absolute',
  },
  card: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 360,
    backgroundColor: '#1E293B', // Slate-800
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F59E0B', // Glowing gold borders
    shadowColor: '#F59E0B',
    shadowOpacity: 0.35,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  trophyContainer: {
    marginTop: -40,
    marginBottom: 16,
  },
  glowRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#334155', // Slate-700
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOpacity: 0.6,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  headerText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#F59E0B', // Vibrant Gold
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  badgeContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  questTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC', // Slate-50
    textAlign: 'center',
  },
  congratsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8', // Slate-400
    marginBottom: 8,
  },
  xpBox: {
    marginVertical: 12,
  },
  xpText: {
    fontSize: 54,
    fontWeight: '900',
    color: '#10B981', // Emerald green +XP
    textAlign: 'center',
    letterSpacing: -1,
  },
  button: {
    backgroundColor: '#F59E0B', // Gold button
    borderBottomWidth: 4,
    borderBottomColor: '#D97706', // Darker gold shade for 3D feel
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 20,
    marginTop: 18,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  buttonText: {
    color: '#0F172A', // Slate-900
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
