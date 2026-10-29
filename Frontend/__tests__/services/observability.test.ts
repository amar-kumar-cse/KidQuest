import * as Sentry from '@sentry/react-native';
import {
  initObservability,
  setObservabilityUser,
  captureError,
  logAnalyticsEvent,
} from '../../lib/observability';

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

describe('Observability & Privacy Safeguards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes Sentry with sendDefaultPii disabled', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://fake-sentry-dsn@sentry.io/123';
    initObservability();

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        sendDefaultPii: false,
        enabled: true,
      })
    );
  });

  it('scrubs PII when setting kid user role', () => {
    setObservabilityUser({
      uid: 'kid-123456789',
      role: 'kid',
      email: 'private_kid@example.com',
    });

    expect(Sentry.setUser).toHaveBeenCalledWith({
      id: 'kid_kid-1234',
      segment: 'kid',
    });
  });

  it('sets parent user with anonymized email marker', () => {
    setObservabilityUser({
      uid: 'parent-999',
      role: 'parent',
      email: 'parent@example.com',
    });

    expect(Sentry.setUser).toHaveBeenCalledWith({
      id: 'parent-999',
      segment: 'parent',
      email: '[REDACTED_PARENT_ACCOUNT]',
    });
  });

  it('resets user on logout', () => {
    setObservabilityUser(null);
    expect(Sentry.setUser).toHaveBeenCalledWith(null);
  });

  it('captures exception with platform tag', () => {
    const error = new Error('Database sync timeout');
    captureError(error, { entityId: 'task-42' });

    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        extra: { entityId: 'task-42' },
        tags: expect.objectContaining({
          platform: expect.any(String),
        }),
      })
    );
  });

  it('logs analytics breadcrumbs without sensitive PII', () => {
    logAnalyticsEvent('quest_completed', { taskId: 'task-101', xp: 50 });

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: 'analytics',
      message: 'quest_completed',
      data: { taskId: 'task-101', xp: 50 },
      level: 'info',
    });
  });
});
