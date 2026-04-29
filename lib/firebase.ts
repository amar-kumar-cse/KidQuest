import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, inMemoryPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { Platform } from 'react-native';


// ─── Firebase Config from Environment Variables ───────────────────────────────
// Keys are stored in .env file (NEVER commit .env to git!)
const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// ─── Initialize Firebase (singleton pattern — prevents double-init) ───────────
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth with persistence
// Note: firebase v10 web SDK — using browserLocalPersistence for web,
// inMemoryPersistence for native (the existing lib/firebase.ts already handles this via the original initializeAuth above)
export const auth = initializeAuth(app, {
  persistence: Platform.OS === 'web'
    ? browserLocalPersistence
    : inMemoryPersistence,
});

// Firestore database
export const db = getFirestore(app);

// Firebase Storage (for photo uploads)
export const storage = getStorage(app);

// Cloud Functions — Mumbai region (asia-south1) for lower latency in India
export const functions = getFunctions(app, 'asia-south1');

export default app;
