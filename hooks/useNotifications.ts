import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { userService } from '../services/userService';

// ─── Configure how notifications appear when app is in foreground ─────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── useNotifications Hook ────────────────────────────────────────────────────

/**
 * Register for push notifications and save the FCM/Expo token to Firestore.
 * Call once from the root layout after auth is initialized.
 */
export function useNotifications(uid: string | null | undefined): void {
  const router = useRouter();
  const listenerRef = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!uid) return;

    registerForPushNotifications(uid).catch((err) => {
      console.warn('[useNotifications] Registration failed (non-fatal):', err);
    });

    listenerRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const type = response.notification.request.content.data?.type;
        if (type === 'task_completed') router.push('/(parent)/dashboard' as any);
        else if (type === 'task_approved' || type === 'task_rejected') router.push('/(kid)/mission-board' as any);
        else if (type === 'daily_reminder') router.push('/(kid)/mission-board' as any);
      },
    );

    return () => {
      if (listenerRef.current) listenerRef.current.remove();
    };
  }, [uid]);
}

async function registerForPushNotifications(uid: string): Promise<void> {
  if (!Device.isDevice) {
    console.log('[useNotifications] Not a real device — skipping push registration');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[useNotifications] Push notification permission denied');
    return;
  }

  // Android channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63FF',
    });
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await userService.saveFcmToken(uid, token);
    console.log('[useNotifications] Push token saved:', token);
  } catch (err) {
    console.warn('[useNotifications] Could not get push token:', err);
  }
}
