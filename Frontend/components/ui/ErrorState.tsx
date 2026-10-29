import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';
import { tokens } from '../../constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface ErrorStateProps {
  icon?: string;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  icon = '⚠️',
  title = 'Something went wrong',
  message = 'We encountered an unexpected issue. Please try again.',
  onRetry,
  retryLabel = 'Try Again',
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={`Error: ${title}. ${message}`}
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
      <Text
        maxFontSizeMultiplier={tokens.typography.maxFontSizeMultiplier}
        style={[
          styles.message,
          isDark ? styles.messageDark : styles.messageLight,
        ]}
      >
        {message}
      </Text>

      {onRetry && (
        <Button
          title={retryLabel}
          onPress={onRetry}
          variant="primary"
          size="md"
          style={styles.retryButton}
        />
      )}
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
    fontSize: 48,
    marginBottom: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.typography.sizes.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: tokens.spacing.sm,
  },
  titleLight: {
    color: tokens.colors.danger,
  },
  titleDark: {
    color: '#F87171', // Red 400 for high dark contrast
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
  retryButton: {
    marginTop: tokens.spacing.sm,
    minWidth: 160,
  },
});

export default ErrorState;

