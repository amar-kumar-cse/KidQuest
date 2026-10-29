import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { registerForPushNotificationsAsync } from '../lib/notificationService';
import { tokens } from '../constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';

const NOTIF_PROMPT_SHOWN_KEY = 'kidquest_notif_prompt_shown';

export interface NotificationPermissionModalProps {
  onPermissionResult?: (granted: boolean) => void;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  onPermissionResult,
}) => {
  const [visible, setVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      const alreadyPrompted = await AsyncStorage.getItem(NOTIF_PROMPT_SHOWN_KEY);
      if (alreadyPrompted) return;

      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        // Show friendly primer modal after 2 seconds
        setTimeout(() => {
          setVisible(true);
        }, 2000);
      }
    } catch (err) {
      console.warn('[NotificationModal] Failed checking permissions:', err);
    }
  };

  const handleEnable = async () => {
    setIsSubmitting(true);
    try {
      await AsyncStorage.setItem(NOTIF_PROMPT_SHOWN_KEY, 'true');
      const token = await registerForPushNotificationsAsync();
      const granted = Boolean(token);
      onPermissionResult?.(granted);
    } catch (err) {
      console.error('[NotificationModal] Error requesting push permission:', err);
      onPermissionResult?.(false);
    } finally {
      setIsSubmitting(false);
      setVisible(false);
    }
  };

  const handleDismiss = async () => {
    await AsyncStorage.setItem(NOTIF_PROMPT_SHOWN_KEY, 'true');
    setVisible(false);
    onPermissionResult?.(false);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      onClose={handleDismiss}
      title="Never Miss a Quest! 🔔"
      subtitle="Stay connected with your family on KidQuest"
    >
      <View style={styles.container}>
        <View style={styles.benefitRow}>
          <Text style={styles.benefitIcon}>🔥</Text>
          <View style={styles.benefitText}>
            <Text
              maxFontSizeMultiplier={tokens.typography.maxFontSizeMultiplier}
              style={[styles.benefitTitle, isDark ? styles.textDark : styles.textLight]}
            >
              Streak Protection
            </Text>
            <Text
              maxFontSizeMultiplier={tokens.typography.maxFontSizeMultiplier}
              style={[styles.benefitDesc, isDark ? styles.descDark : styles.descLight]}
            >
              Get a friendly reminder before midnight to keep your active streak alive.
            </Text>
          </View>
        </View>

        <View style={styles.benefitRow}>
          <Text style={styles.benefitIcon}>🛡️</Text>
          <View style={styles.benefitText}>
            <Text
              maxFontSizeMultiplier={tokens.typography.maxFontSizeMultiplier}
              style={[styles.benefitTitle, isDark ? styles.textDark : styles.textLight]}
            >
              Instant Approvals
            </Text>
            <Text
              maxFontSizeMultiplier={tokens.typography.maxFontSizeMultiplier}
              style={[styles.benefitDesc, isDark ? styles.descDark : styles.descLight]}
            >
              Parents get notified immediately when photo proof is submitted for review.
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Enable Notifications"
            onPress={handleEnable}
            isLoading={isSubmitting}
            variant="primary"
            size="lg"
            style={styles.enableButton}
          />
          <Button
            title="Maybe Later"
            onPress={handleDismiss}
            variant="ghost"
            size="md"
            style={styles.laterButton}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: tokens.spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.lg,
  },
  benefitIcon: {
    fontSize: 28,
    marginRight: tokens.spacing.md,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: tokens.typography.sizes.base,
    fontWeight: '700',
    marginBottom: tokens.spacing.xs,
  },
  benefitDesc: {
    fontSize: tokens.typography.sizes.sm,
    lineHeight: tokens.typography.lineHeights.sm,
  },
  textLight: {
    color: tokens.colors.light.text,
  },
  textDark: {
    color: tokens.colors.dark.text,
  },
  descLight: {
    color: tokens.colors.light.textMuted,
  },
  descDark: {
    color: tokens.colors.dark.textMuted,
  },
  buttonContainer: {
    marginTop: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  enableButton: {
    width: '100%',
  },
  laterButton: {
    width: '100%',
  },
});

export default NotificationPermissionModal;
