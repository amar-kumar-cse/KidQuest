import '@testing-library/react-native';

// ─── 1. Mock expo-router ───────────────────────────────────────────────────────
jest.mock('expo-router', () => {
  const router = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    setParams: jest.fn(),
  };

  return {
    useRouter: () => router,
    useLocalSearchParams: jest.fn(() => ({})),
    useGlobalSearchParams: jest.fn(() => ({})),
    useSegments: jest.fn(() => []),
    usePathname: jest.fn(() => '/'),
    router,
    Link: ({ children, ...props }: any) => children,
  };
});

// ─── 2. Mock expo-notifications ───────────────────────────────────────────────
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notif-id-123'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted', granted: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted', granted: true }),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', TIME_INTERVAL: 'timeInterval', DATE: 'date' },
}));

// ─── 3. Mock expo-speech ───────────────────────────────────────────────────────
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn().mockResolvedValue(false),
}));

// ─── 4. Mock expo-haptics ─────────────────────────────────────────────────────
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// ─── 4b. Mock @sentry/react-native ──────────────────────────────────────────
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  wrap: (comp: any) => comp,
  setUser: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// ─── 5. Mock AsyncStorage ─────────────────────────────────────────────────────
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// ─── 6. Mock Firebase Core & Services ─────────────────────────────────────────
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => [{}]),
  getApp: jest.fn(() => ({})),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: { uid: 'test-user-uid', email: 'test@kidquest.app' },
  })),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback({ uid: 'test-user-uid', email: 'test@kidquest.app' });
    return jest.fn(); // unsubscribe
  }),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn().mockResolvedValue({ id: 'mock-doc-id' }),
  setDoc: jest.fn().mockResolvedValue(undefined),
  getDoc: jest.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({ id: 'mock-doc-id', title: 'Sample' }),
    id: 'mock-doc-id',
  }),
  getDocs: jest.fn().mockResolvedValue({
    docs: [],
    empty: true,
    size: 0,
  }),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  serverTimestamp: jest.fn(() => ({ _type: 'serverTimestamp' })),
  Timestamp: {
    fromDate: jest.fn((date: Date) => ({
      toDate: () => date,
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0,
    })),
    now: jest.fn(() => ({
      toDate: () => new Date(),
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0,
    })),
  },
}));

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() =>
    jest.fn().mockResolvedValue({ data: { success: true } })
  ),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
  ref: jest.fn(),
  uploadBytesResumable: jest.fn(() => ({
    on: jest.fn((event, progress, error, complete) => {
      complete();
    }),
    snapshot: { ref: {} },
  })),
  uploadBytes: jest.fn().mockResolvedValue({}),
  getDownloadURL: jest.fn().mockResolvedValue('https://storage.googleapis.com/test-photo.jpg'),
  deleteObject: jest.fn().mockResolvedValue(undefined),
}));

// Mock app's internal Firebase module
jest.mock('./lib/firebase', () => ({
  app: {},
  auth: {
    currentUser: { uid: 'test-user-uid', email: 'test@kidquest.app' },
  },
  db: {},
  storage: {},
  functions: {},
}));

// ─── 7. Mock NetInfo ──────────────────────────────────────────────────────────
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
  addEventListener: jest.fn(() => jest.fn()),
}));

// ─── 8. Mock expo-image-manipulator ───────────────────────────────────────────
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({
    uri: 'file://mock-optimized-photo.jpg',
    width: 1200,
    height: 900,
  }),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
    WEBP: 'webp',
  },
}));

// ─── 9. Mock expo-sqlite ──────────────────────────────────────────────────────
const mockSqliteDb = {
  execSync: jest.fn(),
  runSync: jest.fn(),
  getAllSync: jest.fn(() => []),
  getFirstSync: jest.fn(() => null),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => mockSqliteDb),
}));

// ─── 10. Mock expo-localization ──────────────────────────────────────────────
jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en', languageTag: 'en-US' }]),
}));

export { mockSqliteDb };
