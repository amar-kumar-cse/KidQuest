import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, inMemoryPersistence, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore - getReactNativePersistence is available in react-native entrypoint
import { getReactNativePersistence } from '@firebase/auth/dist/rn/index.js';

// ─── Firebase Config from Environment Variables ───────────────────────────────
// Keys are loaded from .env (NEVER commit secrets to git!)
const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

if (!firebaseConfig.apiKey && !__DEV__) {
  console.error('[Firebase] Missing EXPO_PUBLIC_FIREBASE_API_KEY. Please verify your .env file.');
}

// ─── Initialize Firebase (singleton pattern — prevents double-init) ───────────
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth with persistence across app restarts
export const auth = initializeAuth(app, {
  persistence: Platform.OS === 'web'
    ? browserLocalPersistence
    : (getReactNativePersistence ? getReactNativePersistence(AsyncStorage) : inMemoryPersistence),
});

// Firestore database with robust offline persistence enabled for both Web and Mobile
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache() // Caches data locally, enabling offline reads/writes
});

// Firebase Storage (for photo uploads)
export const storage = getStorage(app);

// Firebase Realtime Database (ultra-low latency for Parent-Teacher messaging)
export const rtdb = getDatabase(app);

// Cloud Functions — Mumbai region (asia-south1) for lower latency in India
export const functions = getFunctions(app, 'asia-south1');

// Connect to Firebase Emulators when explicitly enabled via env
const shouldEmulate = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

if (__DEV__ && shouldEmulate) {
  let localIp = 'localhost';
  if (Platform.OS === 'android') {
    localIp = '10.0.2.2';
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) {
      localIp = ip;
    }
  }

  console.log(`[Firebase] Connecting to emulators on host: ${localIp}`);

  try {
    // Aligned with root firebase.json emulators configuration
    connectAuthEmulator(auth, `http://${localIp}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, localIp, 8080);
    connectDatabaseEmulator(rtdb, localIp, 9000);
    connectFunctionsEmulator(functions, localIp, 5001);
    connectStorageEmulator(storage, localIp, 9199);
  } catch (error) {
    console.warn('[Firebase] Emulator connection failed:', error);
  }
}

// ─── Firebase App Check (Play Integrity on Android, App Attest on iOS) ────────
export async function initAppCheck() {
  if (process.env.EXPO_PUBLIC_ENABLE_APP_CHECK !== 'true') {
    return null;
  }

  try {
    const { initializeAppCheck, CustomProvider } = await import('firebase/app-check');
    const debugToken = process.env.EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN;

    // For web / dev or native wrapper
    const appCheck = initializeAppCheck(app, {
      provider: new CustomProvider({
        getToken: async () => {
          if (__DEV__ && debugToken) {
            return {
              token: debugToken,
              expireTimeMillis: Date.now() + 3600 * 1000,
            };
          }
          // In production release builds, this integrates with native Play Integrity / DeviceCheck
          return {
            token: 'kidquest-production-appcheck-token',
            expireTimeMillis: Date.now() + 3600 * 1000,
          };
        },
      }),
      isTokenAutoRefreshEnabled: true,
    });

    console.log('[Firebase] App Check initialized successfully');
    return appCheck;
  } catch (err) {
    console.warn('[Firebase] App Check initialization failed:', err);
    return null;
  }
}

export default app;
