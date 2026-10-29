import { useEffect, useRef } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, AppState, AppStateStatus } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAppStore } from '../store/useAppStore';
import { upsertUserProfile } from '../services/api';
import GlobalLoadingOverlay from '../components/GlobalLoadingOverlay';
import OfflineBanner from '../components/OfflineBanner';
import { scheduleDailyReminder } from '../lib/notificationService';
import { useNotifications } from '../hooks/useNotifications';
import { initDatabase } from '../lib/db';
import { syncQueueService } from '../lib/syncQueueService';
import { queryClient } from '../lib/queryClient';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || 'YOUR_SENTRY_DSN_HERE',
  debug: false,
});

/**
 * Root Layout with Firebase Auth Guard + TanStack Query + Offline-first SQLite.
 *
 * Flow:
 *  1. SQLite DB initialized with local tables (WAL mode)
 *  2. QueryClientProvider wraps application for offline-first server state caching
 *  3. Firebase resolves auth state → setUser() in Zustand
 *  4. Fetch user's role from Firestore / cache → setRole()
 *  5. Role-based routing: parent → dashboard, kid → mission-board
 *  6. OfflineBanner displays at top if disconnected or sync items pending
 */
export const unstable_settings = { anchor: '(tabs)' };

function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  const { 
    user, userRole, authLoading, 
    setUser, setRole, setAuthLoading, 
    kidProfile, parentProfile,
    setKidProfile, setParentProfile, clearStore 
  } = useAppStore();

  // ── Database Init & Background Offline Queue processing ──────────
  useEffect(() => {
    // 1. Initialize local SQLite tables
    initDatabase()
      .then(() => {
        // 2. Process queue immediately on start
        syncQueueService.processQueue().catch(() => {});
      })
      .catch((err) => {
        console.warn('[_layout] Failed to init local SQLite DB:', err);
      });

    // 3. Periodically process queue every 30 seconds
    const interval = setInterval(() => {
      syncQueueService.processQueue().catch(() => {});
    }, 30000);

    // 4. Also process when app returns to active foreground status
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        syncQueueService.processQueue().catch(() => {});
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  // ── 1. Listen to Firebase auth state ──────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // Fetch role and profile from Firestore
        try {
          const userSnap = await getDoc(doc(db, 'Users', firebaseUser.uid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            const role = data.role as 'parent' | 'kid';
            setRole(role);
            
            if (role === 'kid') {
              setKidProfile({
                uid: firebaseUser.uid,
                name: data.name || 'Kid',
                totalXp: data.totalXp || 0,
                tasksCompleted: data.tasksCompleted || 0,
                linkedParentId: data.linkedParentId || null,
                avatarEmoji: data.avatarEmoji || '👦',
                hp: data.hp !== undefined ? data.hp : 100,
                hasCompletedOnboarding: data.hasCompletedOnboarding || false,
              });
            } else {
              setParentProfile({
                uid: firebaseUser.uid,
                name: data.name || 'Parent',
                linkedKidIds: data.linkedKids || data.linkedKidIds || [],
                hasCompletedOnboarding: data.hasCompletedOnboarding || false,
              });
            }
          } else {
            // First time login — create a default user profile
            await upsertUserProfile(firebaseUser.uid, {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              role: 'parent',
              linkedKidIds: [],
              totalXp: 0,
              tasksCompleted: 0,
              hasCompletedOnboarding: false,
            });
            setRole('parent');
            setParentProfile({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Parent',
              linkedKidIds: [],
              hasCompletedOnboarding: false,
            });
          }

          // Schedule daily reminder for kids
          const isKid = (await getDoc(doc(db, 'Users', firebaseUser.uid))).data()?.role === 'kid';
          if (isKid) {
            scheduleDailyReminder(16, 0).catch(() => {});
          }

        } catch (err) {
          console.warn('[_layout] Failed to fetch user role:', err);
          setRole('parent'); // Safe default
        }
      } else {
        clearStore();
      }
      setAuthLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // ── 2. Role-based routing ─────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inKidGroup = segments[0] === '(kid)';
    const inParentGroup = segments[0] === '(parent)';
    const inOnboarding = (segments[1] as string) === 'onboarding';

    const profile = userRole === 'kid' ? kidProfile : parentProfile;
    const hasCompletedOnboarding = profile?.hasCompletedOnboarding;

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login' as any);
    } else if (user && !hasCompletedOnboarding && !inOnboarding) {
      router.replace('/(auth)/onboarding' as any);
    } else if (user && hasCompletedOnboarding && inAuthGroup) {
      if (userRole === 'kid') {
        router.replace('/(kid)/mission-board' as any);
      } else {
        router.replace('/(parent)/dashboard' as any);
      }
    } else if (user && userRole === 'kid' && inParentGroup) {
      router.replace('/(kid)/mission-board' as any);
    } else if (user && userRole === 'parent' && inKidGroup) {
      router.replace('/(parent)/dashboard' as any);
    }
  }, [user, userRole, authLoading, segments, kidProfile, parentProfile]);

  // ── 3. Loading State ──────────────────────────────────────────────
  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <OfflineBanner />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(kid)" />
          <Stack.Screen name="(parent)" />
        </Stack>
        <StatusBar style="auto" />
        <GlobalLoadingOverlay />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default Sentry.wrap(RootLayout);
