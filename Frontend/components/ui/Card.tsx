import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { tokens } from '../../constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  children,
  style,
  ...rest
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      style={[
        styles.base,
        styles[padding],
        isDark ? styles[`${variant}Dark` as keyof typeof styles] : styles[variant],
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: tokens.radii.xl,
    overflow: 'hidden',
  },

  // Paddings
  none: {
    padding: 0,
  },
  sm: {
    padding: tokens.spacing.md,
  },
  md: {
    padding: tokens.spacing.xl,
  },
  lg: {
    padding: tokens.spacing['2xl'],
  },

  // Light Variants
  default: {
    backgroundColor: tokens.colors.light.surface,
    borderWidth: 1,
    borderColor: tokens.colors.light.border,
    ...tokens.shadows.sm,
  },
  elevated: {
    backgroundColor: tokens.colors.light.surface,
    ...tokens.shadows.md,
  },
  bordered: {
    backgroundColor: tokens.colors.light.surface,
    borderWidth: 2,
    borderColor: tokens.colors.primaryLight,
  },

  // Dark Variants
  defaultDark: {
    backgroundColor: tokens.colors.dark.surface,
    borderWidth: 1,
    borderColor: tokens.colors.dark.border,
  },
  elevatedDark: {
    backgroundColor: tokens.colors.dark.surfaceElevated,
    borderWidth: 1,
    borderColor: tokens.colors.dark.border,
    ...tokens.shadows.sm,
  },
  borderedDark: {
    backgroundColor: tokens.colors.dark.surface,
    borderWidth: 2,
    borderColor: tokens.colors.primary,
  },
});

export default Card;
