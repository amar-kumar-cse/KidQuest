import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { tokens } from '../../constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: string;
  rightAction?: { icon: string; onPress: () => void; ariaLabel?: string };
  hint?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightAction,
  hint,
  secureTextEntry,
  style,
  ...rest
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isPasswordField = secureTextEntry;

  return (
    <View style={styles.container}>
      {label && (
        <Text
          maxFontSizeMultiplier={tokens.typography.maxFontSizeMultiplier}
          style={[
            styles.label,
            isDark ? styles.labelDark : styles.labelLight,
          ]}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputRow,
          isDark ? styles.inputRowDark : styles.inputRowLight,
          error ? styles.inputRowError : null,
        ]}
      >
        {leftIcon && (
          <Text
            maxFontSizeMultiplier={tokens.typography.maxFontSizeMultiplier}
            style={styles.leftIcon}
          >
            {leftIcon}
          </Text>
        )}

        <TextInput
          maxFontSizeMultiplier={tokens.typography.maxFontSizeMultiplier}
          placeholderTextColor={isDark ? tokens.colors.dark.textSubtle : tokens.colors.light.textSubtle}
          secureTextEntry={isPasswordField && !showPassword}
          accessibilityLabel={label || rest.placeholder}
          accessibilityHint={hint}
          style={[
            styles.textInput,
            isDark ? styles.textInputDark : styles.textInputLight,
            style,
          ]}
          {...rest}
        />

        {isPasswordField && (
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            style={styles.actionButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        )}

        {rightAction && !isPasswordField && (
          <TouchableOpacity
            onPress={rightAction.onPress}
            style={styles.actionButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={rightAction.ariaLabel || 'Action'}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>{rightAction.icon}</Text>
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text
          maxFontSizeMultiplier={tokens.typography.maxFontSizeMultiplier}
          accessibilityRole="alert"
          style={styles.errorText}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text
          maxFontSizeMultiplier={tokens.typography.maxFontSizeMultiplier}
          style={[styles.hintText, isDark ? styles.hintTextDark : styles.hintTextLight]}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: tokens.spacing.lg,
  },
  label: {
    fontSize: tokens.typography.sizes.sm,
    fontWeight: '600',
    marginBottom: tokens.spacing.xs,
    marginLeft: tokens.spacing.xs,
  },
  labelLight: {
    color: tokens.colors.light.textMuted,
  },
  labelDark: {
    color: tokens.colors.dark.textMuted,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: tokens.radii.lg,
    paddingHorizontal: tokens.spacing.lg,
    minHeight: 50, // Comfortably exceeds 44px
    borderWidth: 1,
  },
  inputRowLight: {
    backgroundColor: tokens.colors.light.surface,
    borderColor: tokens.colors.light.borderStrong,
  },
  inputRowDark: {
    backgroundColor: tokens.colors.dark.surfaceSubtle,
    borderColor: tokens.colors.dark.border,
  },
  inputRowError: {
    borderColor: tokens.colors.danger,
  },
  leftIcon: {
    fontSize: tokens.typography.sizes.lg,
    marginRight: tokens.spacing.md,
  },
  textInput: {
    flex: 1,
    fontSize: tokens.typography.sizes.base,
    minHeight: tokens.touch.minSize,
    paddingVertical: tokens.spacing.sm,
  },
  textInputLight: {
    color: tokens.colors.light.text,
  },
  textInputDark: {
    color: tokens.colors.dark.text,
  },
  actionButton: {
    minWidth: tokens.touch.minSize,
    minHeight: tokens.touch.minSize,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: tokens.spacing.xs,
  },
  actionIcon: {
    fontSize: tokens.typography.sizes.lg,
  },
  errorText: {
    color: tokens.colors.danger,
    fontSize: tokens.typography.sizes.xs,
    marginTop: tokens.spacing.xs,
    marginLeft: tokens.spacing.xs,
    fontWeight: '500',
  },
  hintText: {
    fontSize: tokens.typography.sizes.xs,
    marginTop: tokens.spacing.xs,
    marginLeft: tokens.spacing.xs,
  },
  hintTextLight: {
    color: tokens.colors.light.textSubtle,
  },
  hintTextDark: {
    color: tokens.colors.dark.textSubtle,
  },
});

export default Input;
