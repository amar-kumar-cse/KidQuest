import React from 'react';
import { render } from '@testing-library/react-native';
import { OfflineBanner } from '../../components/OfflineBanner';
import * as networkHook from '../../hooks/useNetworkStatus';

// Mock safe area insets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}));

describe('OfflineBanner Component', () => {
  it('renders nothing when connected online and zero pending sync items', () => {
    jest.spyOn(networkHook, 'useNetworkStatus').mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      isOffline: false,
      pendingSyncCount: 0,
    });

    const { toJSON } = render(<OfflineBanner />);
    expect(toJSON()).toBeNull();
  });

  it('renders warning banner when offline', () => {
    jest.spyOn(networkHook, 'useNetworkStatus').mockReturnValue({
      isConnected: false,
      isInternetReachable: false,
      isOffline: true,
      pendingSyncCount: 3,
    });

    const { getByText, getByRole } = render(<OfflineBanner />);

    expect(getByText('Offline Mode — Changes save locally')).toBeTruthy();
    expect(getByText(/3 pending/)).toBeTruthy();
    expect(getByRole('alert')).toBeTruthy();
  });

  it('renders syncing indicator when online but has pending mutations', () => {
    jest.spyOn(networkHook, 'useNetworkStatus').mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      isOffline: false,
      pendingSyncCount: 2,
    });

    const { getByText } = render(<OfflineBanner />);

    expect(getByText('Syncing 2 local changes...')).toBeTruthy();
    expect(getByText('2 pending • Retry')).toBeTruthy();
  });
});

