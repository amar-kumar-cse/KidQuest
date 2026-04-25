import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import * as Speech from 'expo-speech';

// ─── Motivational Messages by XP Tier ────────────────────────────────

const MESSAGES_BY_TIER: Record<string, string[]> = {
  novice: [
    "Every hero starts somewhere. You've got this! 🌟",
    "One quest at a time, champion! ⚔️",
    "Your adventure is just beginning! 🗺️",
  ],
  apprentice: [
    "You're levelling up fast! Keep crushing those quests! 🔥",
    "Look at you go! The leaderboard is watching! 🏆",
    "Streaks don't break when legends are in the zone! ⚡",
  ],
  hero: [
    "LEGENDARY! Your XP speaks for itself! 💎",
    "Champions never stop. Neither do you! 🚀",
    "You make this look easy. Incredible! 🎖️",
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────

function getTier(xp: number): keyof typeof MESSAGES_BY_TIER {
  if (xp >= 2000) return 'hero';
  if (xp >= 500)  return 'apprentice';
  return 'novice';
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Types ────────────────────────────────────────────────────────────

interface AiMotivatorProps {
  /** Kid's current XP — used to pick the message tier */
  kidXp?: number;
}

// ─── Component ────────────────────────────────────────────────────────

/**
 * AiMotivator
 * A friendly AI buddy card that speaks a motivational message when tapped.
 * Uses expo-speech (already installed) — no API key required.
 */
export default function AiMotivator({ kidXp = 0 }: AiMotivatorProps) {
  const [message, setMessage]     = useState<string>('');
  const [speaking, setSpeaking]   = useState(false);
  const bounceAnim                = useRef(new Animated.Value(0)).current;
  const glowAnim                  = useRef(new Animated.Value(1)).current;

  // Entrance bounce
  useEffect(() => {
    Animated.spring(bounceAnim, {
      toValue: 1,
      friction: 5,
      tension: 60,
      useNativeDriver: true,
    }).start();

    // Idle pulse on the button
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ]),
    ).start();

    return () => {
      Speech.stop();
    };
  }, []);

  const handleMotivate = async () => {
    if (speaking) {
      await Speech.stop();
      setSpeaking(false);
      return;
    }

    const tier    = getTier(kidXp);
    const picked  = pickRandom(MESSAGES_BY_TIER[tier]);
    setMessage(picked);
    setSpeaking(true);

    Speech.speak(picked, {
      language: 'en-US',
      pitch: 1.1,
      rate: 0.95,
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const cardScale = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: cardScale }] }]}>
      {/* Avatar */}
      <View style={styles.avatarRow}>
        <Text style={styles.avatar}>🤖</Text>
        <View style={styles.nameBadge}>
          <Text style={styles.nameText}>Quest AI</Text>
          <Text style={styles.nameSubtext}>Your Motivation Coach</Text>
        </View>
      </View>

      {/* Speech bubble */}
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>
          {message || "Tap below and I'll fire you up! 🔥"}
        </Text>
      </View>

      {/* Motivate Button */}
      <Animated.View style={{ transform: [{ scale: glowAnim }] }}>
        <TouchableOpacity
          style={[styles.button, speaking && styles.buttonActive]}
          onPress={handleMotivate}
          activeOpacity={0.8}
        >
          {speaking ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>
              {message ? '🔁 Again!' : '⚡ Motivate Me!'}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    gap: 14,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    fontSize: 36,
  },
  nameBadge: {
    flex: 1,
  },
  nameText: {
    color: '#a5b4fc',
    fontSize: 16,
    fontWeight: '700',
  },
  nameSubtext: {
    color: '#64748b',
    fontSize: 12,
  },
  bubble: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  bubbleText: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#4f46e5',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
