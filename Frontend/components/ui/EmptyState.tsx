import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { tokens } from '../../constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📭',
  title,
  message,
  action,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="none"
      accessibilityLabel={`${title}. ${message || ''}`}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text
        maxFontSizeMultiplier={tokens.typography.maxFontSizeMultiplier}
        style={[
          styles.title,
          isDark ? styles.titleDark : styles.titleLight,
        ]}
      >
        {title}
      </Text>
      {message && (
        <Text
          maxFontSizeMultiplier={tokens.typography.maxFontSizeMultiplier}
          style={[
            styles.message,
            isDark ? styles.messageDark : styles.messageLight,
          ]}
        >
          {message}
        </Text>
      )}
      {action && <View style={styles.actionContainer}>{action}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing['4xl'],
    paddingHorizontal: tokens.spacing['2xl'],
    width: '100%',
  },
  icon: {
    fontSize: 52,
    marginBottom: tokens.spacing.lg,
  },
  title: {
    fontSize: tokens.typography.sizes.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: tokens.spacing.sm,
  },
  titleLight: {
    color: tokens.colors.light.text,
  },
  titleDark: {
    color: tokens.colors.dark.text,
  },
  message: {
    fontSize: tokens.typography.sizes.sm,
    lineHeight: tokens.typography.lineHeights.sm,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: tokens.spacing.xl,
  },
  messageLight: {
    color: tokens.colors.light.textMuted,
  },
  messageDark: {
    color: tokens.colors.dark.textMuted,
  },
  actionContainer: {
    marginTop: tokens.spacing.sm,
  },
});

export default EmptyState;
