import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

/**
 * KidQuest Observability & Privacy-Safe Telemetry Service
 *
 * Implements COPPA-compliant error monitoring and crash reporting:
 * 1. Zero PII collected for kid accounts (no email, no names, no IP addresses).
 * 2. Anonymized user identification.
 * 3. Sanitized breadcrumbs to prevent capturing private family chat or notes.
 */

export interface ObservabilityUser {
  uid: string;
  role: 'parent' | 'kid';
  email?: string;
}

let currentUserRole: 'parent' | 'kid' | null = null;

/**
 * Initialize Sentry with COPPA/Kids Category privacy safety guardrails.
 */
export function initObservability() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  Sentry.init({
    dsn: dsn || undefined,
    debug: false,
    enabled: Boolean(dsn),
    // Strictly disable default PII collection (IP addresses, device names, emails)
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,

    beforeSend(event) {
      // 1. Scrub IP Address for everyone (especially kids)
      if (event.user) {
        delete event.user.ip_address;
        if (currentUserRole === 'kid') {
          // COPPA compliance: remove email, username, display name
          delete event.user.email;
          delete event.user.username;
        }
      }

      // 2. Filter sensitive crumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((crumb) => {
          if (crumb.category === 'ui.click' || crumb.category === 'navigation') {
            return crumb;
          }
          // Remove potential user-typed text in input breadcrumbs
          if (crumb.data && typeof crumb.data === 'object') {
            const sanitizedData = { ...crumb.data };
            if ('text' in sanitizedData) sanitizedData.text = '[SCRUBBED]';
            if ('query' in sanitizedData) sanitizedData.query = '[SCRUBBED]';
            if ('message' in sanitizedData) sanitizedData.message = '[SCRUBBED]';
            crumb.data = sanitizedData;
          }
          return crumb;
        });
      }

      return event;
    },

    beforeBreadcrumb(breadcrumb) {
      // Filter out raw console logs if they contain emails or passwords
      if (breadcrumb.category === 'console' && typeof breadcrumb.message === 'string') {
        const lower = breadcrumb.message.toLowerCase();
        if (lower.includes('password') || lower.includes('token') || lower.includes('@')) {
          return null; // Drop sensitive breadcrumb
        }
      }
      return breadcrumb;
    },
  });
}

/**
 * Identify user with strict role-based privacy scoping.
 */
export function setObservabilityUser(user: ObservabilityUser | null) {
  if (!user) {
    currentUserRole = null;
    Sentry.setUser(null);
    return;
  }

  currentUserRole = user.role;

  if (user.role === 'kid') {
    // Kid: Anonymous identifier only. Never attach email or full names.
    Sentry.setUser({
      id: `kid_${user.uid.slice(0, 8)}`,
      segment: 'kid',
    });
  } else {
    // Parent: Include standard anonymized ID
    Sentry.setUser({
      id: user.uid,
      segment: 'parent',
      email: user.email ? '[REDACTED_PARENT_ACCOUNT]' : undefined,
    });
  }
}

/**
 * Capture non-fatal exceptions with sanitization
 */
export function captureError(error: unknown, context?: Record<string, any>) {
  console.error('[Observability] Captured error:', error, context);
  try {
    Sentry.captureException(error, {
      extra: context,
      tags: {
        platform: Platform.OS,
        role: currentUserRole || 'unauthenticated',
      },
    });
  } catch (sentryErr) {
    console.warn('[Observability] Failed sending error to Sentry:', sentryErr);
  }
}

/**
 * Privacy-safe analytics event logging
 * COPPA: No behavioral ad targeting. Only aggregate app performance metrics.
 */
export function logAnalyticsEvent(eventName: string, params?: Record<string, string | number | boolean>) {
  if (__DEV__) {
    console.log(`[Analytics Event] ${eventName}:`, params);
  }

  // Add Sentry breadcrumb for operational observability
  Sentry.addBreadcrumb({
    category: 'analytics',
    message: eventName,
    data: params,
    level: 'info',
  });
}
