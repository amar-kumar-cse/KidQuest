import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { syncQueueService } from '../lib/syncQueueService';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  isOffline: boolean;
  pendingSyncCount: number;
}

export function useNetworkStatus(): NetworkStatus {
  const [netState, setNetState] = useState<NetInfoState | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    // 1. Initial network check
    NetInfo.fetch().then((state) => {
      setNetState(state);
    });

    // 2. Subscribe to network connectivity changes
    const unsubNet = NetInfo.addEventListener((state) => {
      setNetState(state);
      // When transitioning from offline to online, trigger queue processing
      if (state.isConnected && state.isInternetReachable !== false) {
        syncQueueService.processQueue().catch(() => {});
      }
    });

    // 3. Subscribe to pending sync queue count changes
    const unsubQueue = syncQueueService.subscribe((count) => {
      setPendingCount(count);
    });

    return () => {
      unsubNet();
      unsubQueue();
    };
  }, []);

  const isConnected = netState?.isConnected ?? true;
  const isInternetReachable = netState?.isInternetReachable ?? true;
  // Consider offline if not connected OR if internet is definitely not reachable
  const isOffline = !isConnected || isInternetReachable === false;

  return {
    isConnected,
    isInternetReachable,
    isOffline,
    pendingSyncCount: pendingCount,
  };
}

