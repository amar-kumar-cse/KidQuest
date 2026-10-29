import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  type TouchableOpacityProps,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { tokens } from '../../constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'kid';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: string;
  enableHaptics?: boolean;
  ariaLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  disabled,
  enableHaptics = true,
  ariaLabel,
  style,
  onPress,
  ...rest
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handlePress = (e: any) => {
    if (disabled || isLoading) return;
    if (enableHaptics) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      } catch {}
    }
    onPress?.(e);
  };

  const isInteractiveDisabled = disabled || isLoading;

  // View Styles
  const sizeViewStyle = sizeStyles[size];
  const variantViewStyle = isDark ? darkVariantStyles[variant] : lightVariantStyles[variant];

  // Text Styles
  const sizeTextStyle = sizeTextStyles[size];
  const variantTextStyle = isDark ? darkVariantTextStyles[variant] : lightVariantTextStyles[variant];

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isInteractiveDisabled}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={ariaLabel || title}
      accessibilityState={{
        disabled: Boolean(disabled),
        busy: Boolean(isLoading),
      }}
      activeOpacity={0.75}
      style={[
        styles.base,
        sizeViewStyle,
        variantViewStyle,
        isInteractiveDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'ghost' ? tokens.colors.primary : '#FFFFFF'}
          accessibilityLabel="Loading"
        />
      ) : (
        <>
          {leftIcon && (
            <Text
              style={[styles.iconText, sizeTextStyle]}
              maxFontSizeMultiplier={tokens.typography.maxFontSizeMultiplier}
            >
              {leftIcon}
            </Text>
          )}
          <Text
            maxFontSizeMultiplier={tokens.typography.maxFontSizeMultiplier}
            style={[
              styles.textBase,
              sizeTextStyle,
              variantTextStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: tokens.touch.minSize, // 44px+ WCAG standard
    minWidth: tokens.touch.minSize,
    borderRadius: tokens.radii.lg,
  },
  disabled: {
    opacity: 0.5,
  },
  textBase: {
    fontWeight: '700',
    textAlign: 'center',
  },
  iconText: {
    marginRight: tokens.spacing.sm,
  },
});

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    minHeight: tokens.touch.minSize,
  },
  md: {
    paddingHorizontal: tokens.spacing.xl,
    paddingVertical: tokens.spacing.md,
    minHeight: 48,
  },
  lg: {
    paddingHorizontal: tokens.spacing['2xl'],
    paddingVertical: tokens.spacing.lg,
    minHeight: 54,
  },
};

const sizeTextStyles: Record<ButtonSize, TextStyle> = {
  sm: {
    fontSize: tokens.typography.sizes.sm,
    lineHeight: tokens.typography.lineHeights.sm,
  },
  md: {
    fontSize: tokens.typography.sizes.base,
    lineHeight: tokens.typography.lineHeights.base,
  },
  lg: {
    fontSize: tokens.typography.sizes.lg,
    lineHeight: tokens.typography.lineHeights.lg,
  },
};

const lightVariantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: tokens.colors.primary,
  },
  secondary: {
    backgroundColor: tokens.colors.light.surfaceSubtle,
    borderWidth: 1,
    borderColor: tokens.colors.light.border,
  },
  danger: {
    backgroundColor: tokens.colors.danger,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: tokens.colors.primaryLight,
  },
  kid: {
    backgroundColor: tokens.colors.xpGold,
    borderBottomWidth: 4,
    borderBottomColor: '#D97706',
  },
};

const darkVariantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: tokens.colors.primaryHover,
  },
  secondary: {
    backgroundColor: tokens.colors.dark.surfaceSubtle,
    borderWidth: 1,
    borderColor: tokens.colors.dark.border,
  },
  danger: {
    backgroundColor: '#DC2626',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: tokens.colors.primary,
  },
  kid: {
    backgroundColor: '#D97706',
    borderBottomWidth: 4,
    borderBottomColor: '#B45309',
  },
};

const lightVariantTextStyles: Record<ButtonVariant, TextStyle> = {
  primary: { color: '#FFFFFF' },
  secondary: { color: tokens.colors.light.text },
  danger: { color: '#FFFFFF' },
  ghost: { color: tokens.colors.primary },
  kid: { color: '#451A03', fontWeight: '800' },
};

const darkVariantTextStyles: Record<ButtonVariant, TextStyle> = {
  primary: { color: '#FFFFFF' },
  secondary: { color: tokens.colors.dark.text },
  danger: { color: '#FFFFFF' },
  ghost: { color: tokens.colors.primaryLight },
  kid: { color: '#FFFFFF', fontWeight: '800' },
};

export default Button;
