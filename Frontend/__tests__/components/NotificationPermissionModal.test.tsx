import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { NotificationPermissionModal } from '../../components/NotificationPermissionModal';

jest.mock('../../lib/notificationService', () => ({
  registerForPushNotificationsAsync: jest.fn().mockResolvedValue('ExponentPushToken[mock-token-xyz]'),
}));

describe('NotificationPermissionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not display if user has already been prompted', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('true');

    const { queryByText } = render(<NotificationPermissionModal />);

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(2500);
    });

    expect(queryByText('Never Miss a Quest! 🔔')).toBeNull();
  });

  it('renders educational modal if permission is not granted and not yet prompted', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'undetermined' });

    const { getByText } = render(<NotificationPermissionModal />);
    
    await act(async () => {
      // Flush async microtasks inside useEffect
      await Promise.resolve();
      await Promise.resolve();
      jest.advanceTimersByTime(2500);
    });

    expect(getByText('Never Miss a Quest! 🔔')).toBeTruthy();
    expect(getByText('Streak Protection')).toBeTruthy();
    expect(getByText('Instant Approvals')).toBeTruthy();
  });

  it('requests permissions and persists choice when user clicks Enable', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'undetermined' });

    const onResult = jest.fn();
    const { getByText } = render(<NotificationPermissionModal onPermissionResult={onResult} />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      jest.advanceTimersByTime(2500);
    });

    expect(getByText('Enable Notifications')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText('Enable Notifications'));
      await Promise.resolve();
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('kidquest_notif_prompt_shown', 'true');
    expect(onResult).toHaveBeenCalledWith(true);
  });
});
