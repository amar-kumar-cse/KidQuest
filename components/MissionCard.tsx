import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';

interface MissionCardProps {
  title: string;
  type: string;
  isRequired?: boolean;
  progress?: number; 
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function MissionCard({ title, type, isRequired = true, progress = 0.5, onPress }: MissionCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    if (onPress) {
      scale.value = withSequence(withSpring(0.9), withSpring(1));
      onPress();
    }
  };

  // Determine icon based on type
  const getIcon = (typeStr: string) => {
    const t = typeStr.toLowerCase();
    if (t.includes('math')) return 'x÷';
    if (t.includes('read')) return '📖';
    if (t.includes('chore')) return '🧹';
    if (t.includes('exercise')) return '🏃';
    return '⭐';
  };

  return (
    <AnimatedPressable 
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[styles.container, animatedStyle]}
    >
      {/* Top Yellow Tab */}
      <View style={styles.tabHeader}>
        <Text style={styles.tabText}>{type}</Text>
      </View>
      
      {/* Main White Content */}
      <View style={styles.content}>
        <View style={styles.infoRow}>
          
          {/* Icon Box */}
          <View style={styles.iconBox}>
             <Text style={styles.iconText}>{getIcon(type)}</Text>
          </View>

          {/* Text Info */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{type}</Text>
          </View>
          
        </View>

        {/* Required Badge & Progress */}
        <View style={styles.bottomRow}>
          {isRequired && (
            <View style={styles.reqBadge}>
              <View style={styles.dot} />
              <Text style={styles.reqText}>Required</Text>
            </View>
          )}

          {/* Progress Bar Container */}
          <View style={styles.progressContainer}>
            <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    // Soft shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  tabHeader: {
    backgroundColor: '#FFD700', // Yellow from brand
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontWeight: '800',
    color: '#000080', // Dark Blue
    fontSize: 14,
  },
  content: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 50,
    height: 50,
    backgroundColor: '#E1F1F8', // Light blue bg
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#87CEEB',
    letterSpacing: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000080',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#A0AEC0',
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reqBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
    marginRight: 6,
  },
  reqText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A5568',
  },
  progressContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#EDF2F7',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#87CEEB',
    borderRadius: 3,
  }
});
