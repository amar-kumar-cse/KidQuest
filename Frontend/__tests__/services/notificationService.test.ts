import * as Notifications from 'expo-notifications';
import {
  notifyParentTaskCompleted,
  notifyParentApprovalRequest,
  notifyKidTaskApproved,
  notifyKidTaskRejected,
  scheduleStreakAtRiskReminder,
  cancelStreakAtRiskReminder,
  scheduleDailyReminder,
  cancelDailyReminder,
  notifyParentRewardClaimed,
} from '../../lib/notificationService';

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Immediate local alerts', () => {
    it('schedules task completion alert to parent', async () => {
      await notifyParentTaskCompleted('Aarav', 'Clean Room');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: '✅ Task Completed!',
            body: expect.stringContaining('Aarav finished "Clean Room"'),
          }),
          trigger: null,
        })
      );
    });

    it('schedules approval request alert to parent', async () => {
      await notifyParentApprovalRequest('Priya', 'Math Homework', 100);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: '🛡️ Approval Request',
            body: expect.stringContaining('Priya submitted proof for "Math Homework" (+100 XP)'),
          }),
          trigger: null,
        })
      );
    });

    it('schedules task approved celebratory alert to kid', async () => {
      await notifyKidTaskApproved('Math Homework', 100);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: '🎉 Quest Approved!',
            body: expect.stringContaining('You earned +100 XP!'),
            data: { type: 'task_approved', xpAwarded: 100 },
          }),
          trigger: null,
        })
      );
    });

    it('schedules task rejected alert to kid', async () => {
      await notifyKidTaskRejected('Make Bed');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: '🔄 Quest Returned',
          }),
          trigger: null,
        })
      );
    });

    it('schedules reward claimed alert to parent', async () => {
      await notifyParentRewardClaimed('Aarav', 'Ice Cream', 150);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: '🏆 Reward Claimed!',
            body: expect.stringContaining('spent 150 XP to claim "Ice Cream"'),
          }),
          trigger: null,
        })
      );
    });
  });

  describe('Streak at risk and daily reminders', () => {
    it('schedules streak at risk reminder when streak > 0', async () => {
      await scheduleStreakAtRiskReminder(5, 20, 0);
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('streak-at-risk-reminder');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: 'streak-at-risk-reminder',
          content: expect.objectContaining({
            title: '🔥 Streak At Risk!',
            body: expect.stringContaining('Your 5-day streak is on the line!'),
          }),
        })
      );
    });

    it('does not schedule streak at risk if streak is 0', async () => {
      await scheduleStreakAtRiskReminder(0);
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('streak-at-risk-reminder');
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('cancels streak at risk reminder', async () => {
      await cancelStreakAtRiskReminder();
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('streak-at-risk-reminder');
    });

    it('schedules and cancels daily quest reminder', async () => {
      await scheduleDailyReminder(16, 30);
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('daily-quest-reminder');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: 'daily-quest-reminder',
          content: expect.objectContaining({
            title: '⚔️ Quests Awaiting!',
          }),
        })
      );

      await cancelDailyReminder();
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('daily-quest-reminder');
    });
  });
});

