import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, inMemoryPersistence, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ─── Firebase Config from Environment Variables ───────────────────────────────
// Keys are stored in .env file (NEVER commit .env to git!)
const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'mock-api-key',
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-no-project.firebaseapp.com',
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'demo-no-project',
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-no-project.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

// ─── Initialize Firebase (singleton pattern — prevents double-init) ───────────
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth with persistence
export const auth = initializeAuth(app, {
  persistence: Platform.OS === 'web'
    ? browserLocalPersistence
    : inMemoryPersistence,
});

// Firestore database with robust offline persistence enabled for both Web and Mobile
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache() // Caches data locally, enabling offline reads/writes
});

// Firebase Storage (for photo uploads)
export const storage = getStorage(app);

// Cloud Functions — Mumbai region (asia-south1) for lower latency in India
export const functions = getFunctions(app, 'asia-south1');

// Connect to Firebase Emulators in development mode
if (__DEV__) {
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
    // Auth emulator port is 9098
    connectAuthEmulator(auth, `http://${localIp}:9098`, { disableWarnings: true });
    
    // Firestore emulator port is 8083
    connectFirestoreEmulator(db, localIp, 8083);
    
    // Functions emulator port is 5002
    connectFunctionsEmulator(functions, localIp, 5002);

    // Storage emulator port is 9199
    connectStorageEmulator(storage, localIp, 9199);
  } catch (error) {
    console.warn('[Firebase] Emulator connection failed:', error);
  }
}

export default app;
