import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '../../hooks/useLanguage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { tokens } from '../../constants/tokens';

export const LanguageToggle: React.FC = () => {
  const { language, changeLanguage } = useLanguage();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      style={[
        styles.container,
        isDark ? styles.darkContainer : styles.lightContainer,
      ]}
      accessible={true}
      accessibilityRole="radiogroup"
      accessibilityLabel="Language selection"
    >
      <TouchableOpacity
        onPress={() => changeLanguage('en')}
        style={[
          styles.pill,
          language === 'en' && (isDark ? styles.activeDarkPill : styles.activeLightPill),
        ]}
        accessibilityRole="radio"
        accessibilityState={{ selected: language === 'en' }}
        accessibilityLabel="English language"
        activeOpacity={0.7}
      >
        <Text
          maxFontSizeMultiplier={tokens.typography.maxFontSizeMultiplier}
          style={[
            styles.text,
            isDark ? styles.darkText : styles.lightText,
            language === 'en' && styles.activeText,
          ]}
        >
          EN
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => changeLanguage('hi')}
        style={[
          styles.pill,
          language === 'hi' && (isDark ? styles.activeDarkPill : styles.activeLightPill),
        ]}
        accessibilityRole="radio"
        accessibilityState={{ selected: language === 'hi' }}
        accessibilityLabel="Hindi language"
        activeOpacity={0.7}
      >
        <Text
          maxFontSizeMultiplier={tokens.typography.maxFontSizeMultiplier}
          style={[
            styles.text,
            isDark ? styles.darkText : styles.lightText,
            language === 'hi' && styles.activeText,
          ]}
        >
          हिन्दी
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: tokens.radii.full,
    padding: 3,
    borderWidth: 1,
  },
  lightContainer: {
    backgroundColor: tokens.colors.light.surfaceSubtle,
    borderColor: tokens.colors.light.border,
  },
  darkContainer: {
    backgroundColor: tokens.colors.dark.surfaceSubtle,
    borderColor: tokens.colors.dark.border,
  },
  pill: {
    minHeight: tokens.touch.minSize,
    minWidth: tokens.touch.minSize,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeLightPill: {
    backgroundColor: tokens.colors.primary,
  },
  activeDarkPill: {
    backgroundColor: tokens.colors.primary,
  },
  text: {
    fontSize: tokens.typography.sizes.sm,
    fontWeight: '600',
  },
  lightText: {
    color: tokens.colors.light.textMuted,
  },
  darkText: {
    color: tokens.colors.dark.textMuted,
  },
  activeText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

export default LanguageToggle;

