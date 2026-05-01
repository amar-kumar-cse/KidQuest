import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications and return the Expo Push Token.
 * This token can be stored in Firestore and used to send remote pushes via FCM.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId 
      ?? Constants.easConfig?.projectId;

    if (projectId) {
      const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
      token = pushToken.data;
    }
  } catch (error) {
    console.error('Error getting push token:', error);
  }

  // Android needs a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'KidQuest Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFD700',
    });

    await Notifications.setNotificationChannelAsync('tasks', {
      name: 'Task Updates',
      description: 'Notifications for task completions and approvals',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4f46e5',
    });

    await Notifications.setNotificationChannelAsync('rewards', {
      name: 'Reward Alerts',
      description: 'Notifications for reward claims',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#FFD700',
    });
  }

  return token;
}

// ─── Local Notification Helpers ──────────────────────────────────────

/**
 * Send a local notification to the parent when a kid completes a task
 */
export async function notifyParentTaskCompleted(kidName: string, taskTitle: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✅ Task Completed!',
      body: `${kidName} finished "${taskTitle}" and is waiting for your approval.`,
      data: { type: 'task_completed' },
      sound: 'default',
    },
    trigger: null, // Immediate
  });
}

/**
 * Send a local notification to the kid when their task is approved
 */
export async function notifyKidTaskApproved(taskTitle: string, xp: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎉 Quest Approved!',
      body: `"${taskTitle}" was approved! You earned +${xp} XP!`,
      data: { type: 'task_approved' },
      sound: 'default',
    },
    trigger: null,
  });
}

/**
 * Send a local notification to the kid when their task is rejected
 */
export async function notifyKidTaskRejected(taskTitle: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔄 Quest Returned',
      body: `"${taskTitle}" needs another try. Check the details and give it your best!`,
      data: { type: 'task_rejected' },
      sound: 'default',
    },
    trigger: null,
  });
}

/**
 * Schedule a daily reminder for the kid to complete their quests
 */
export async function scheduleDailyReminder(hour: number = 16, minute: number = 0) {
  // Cancel existing daily reminders
  await cancelDailyReminder();

  await Notifications.scheduleNotificationAsync({
    identifier: 'daily-quest-reminder',
    content: {
      title: '⚔️ Quests Awaiting!',
      body: "You still have quests to complete today. Don't let them expire!",
      data: { type: 'daily_reminder' },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/**
 * Cancel the daily reminder
 */
export async function cancelDailyReminder() {
  await Notifications.cancelScheduledNotificationAsync('daily-quest-reminder');
}

/**
 * Notify parent when kid claims a reward
 */
export async function notifyParentRewardClaimed(kidName: string, rewardTitle: string, cost: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🏆 Reward Claimed!',
      body: `${kidName} spent ${cost} XP to claim "${rewardTitle}".`,
      data: { type: 'reward_claimed' },
      sound: 'default',
    },
    trigger: null,
  });
}
