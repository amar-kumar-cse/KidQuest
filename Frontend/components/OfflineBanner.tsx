import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { syncQueueService } from '../lib/syncQueueService';

export const OfflineBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { isOffline, pendingSyncCount } = useNetworkStatus();

  // If online and nothing is pending sync, hide the banner
  if (!isOffline && pendingSyncCount === 0) {
    return null;
  }

  const handleManualRetry = () => {
    syncQueueService.processQueue().catch(() => {});
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top, 8) + 4 },
        isOffline ? styles.offlineBg : styles.syncingBg,
      ]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={
        isOffline
          ? `Offline mode. ${pendingSyncCount} changes waiting to sync.`
          : `Syncing ${pendingSyncCount} changes to server.`
      }
    >
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.statusDot}>{isOffline ? '⚡' : '🔄'}</Text>
          <Text style={styles.messageText}>
            {isOffline
              ? 'Offline Mode — Changes save locally'
              : `Syncing ${pendingSyncCount} local change${pendingSyncCount > 1 ? 's' : ''}...`}
          </Text>
        </View>

        {pendingSyncCount > 0 && (
          <TouchableOpacity
            onPress={handleManualRetry}
            style={styles.pill}
            activeOpacity={0.8}
            accessibilityLabel={`Retry sync. ${pendingSyncCount} pending.`}
          >
            <Text style={styles.pillText}>
              {pendingSyncCount} pending {isOffline ? '' : '• Retry'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 9999,
  },
  offlineBg: {
    backgroundColor: '#b45309', // Deep amber
  },
  syncingBg: {
    backgroundColor: '#1e3a8a', // Deep blue
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  statusDot: {
    fontSize: 14,
    marginRight: 6,
  },
  messageText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  pill: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default OfflineBanner;

