import * as Sentry from '@sentry/react-native';

/**
 * Initialize Sentry crash tracking and performance monitoring.
 * Safe to call on app startup.
 */
export function initSentry() {
  if (!__DEV__) {
    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
      debug: false,
      tracesSampleRate: 0.2,
    });
  }
}

export { Sentry };
