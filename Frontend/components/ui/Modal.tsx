import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type ModalProps as RNModalProps,
} from 'react-native';
import { tokens } from '../../constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface ModalProps extends RNModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  animationType = 'fade',
  ...rest
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <RNModal
      visible={visible}
      transparent={true}
      animationType={animationType}
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
      {...rest}
    >
      <TouchableWithoutFeedback onPress={onClose} accessible={false}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback accessible={false}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardContainer}
            >
              <View
                style={[
                  styles.card,
                  isDark ? styles.cardDark : styles.cardLight,
                ]}
                accessible={true}
                accessibilityRole="none"
              >
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.titleContainer}>
                    {title && (
                      <Text
                        maxFontSizeMultiplier={tokens.typography.maxFontSizeMultiplier}
                        style={[
                          styles.title,
                          isDark ? styles.titleDark : styles.titleLight,
                        ]}
                      >
                        {title}
                      </Text>
                    )}
                    {subtitle && (
                      <Text
                        maxFontSizeMultiplier={tokens.typography.maxFontSizeMultiplier}
                        style={[
                          styles.subtitle,
                          isDark ? styles.subtitleDark : styles.subtitleLight,
                        ]}
                      >
                        {subtitle}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeButton}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Close dialog"
                    activeOpacity={0.7}
                  >
                    <Text
                      maxFontSizeMultiplier={tokens.typography.maxFontSizeMultiplier}
                      style={[
                        styles.closeIcon,
                        isDark ? styles.closeIconDark : styles.closeIconLight,
                      ]}
                    >
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Content */}
                <View style={styles.body}>{children}</View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.xl,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 480,
  },
  card: {
    width: '100%',
    borderRadius: tokens.radii['2xl'],
    padding: tokens.spacing.xl,
    ...tokens.shadows.lg,
  },
  cardLight: {
    backgroundColor: tokens.colors.light.surface,
    borderColor: tokens.colors.light.border,
    borderWidth: 1,
  },
  cardDark: {
    backgroundColor: tokens.colors.dark.surfaceElevated,
    borderColor: tokens.colors.dark.border,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.lg,
  },
  titleContainer: {
    flex: 1,
    marginRight: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.typography.sizes.xl,
    fontWeight: '700',
  },
  titleLight: {
    color: tokens.colors.light.text,
  },
  titleDark: {
    color: tokens.colors.dark.text,
  },
  subtitle: {
    fontSize: tokens.typography.sizes.sm,
    marginTop: tokens.spacing.xs,
  },
  subtitleLight: {
    color: tokens.colors.light.textMuted,
  },
  subtitleDark: {
    color: tokens.colors.dark.textMuted,
  },
  closeButton: {
    minWidth: tokens.touch.minSize,
    minHeight: tokens.touch.minSize,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: tokens.radii.full,
  },
  closeIcon: {
    fontSize: tokens.typography.sizes.lg,
    fontWeight: '700',
  },
  closeIconLight: {
    color: tokens.colors.light.textSubtle,
  },
  closeIconDark: {
    color: tokens.colors.dark.textSubtle,
  },
  body: {
    width: '100%',
  },
});

export default Modal;

