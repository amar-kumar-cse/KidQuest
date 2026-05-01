import { useEffect, useRef } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAppStore } from '../store/useAppStore';
import { upsertUserProfile } from '../services/api';
import GlobalLoadingOverlay from '../components/GlobalLoadingOverlay';
import { scheduleDailyReminder } from '../lib/notificationService';
import { useNotifications } from '../hooks/useNotifications';

/**
 * Root Layout with Firebase Auth Guard + Zustand State Management.
 *
 * Flow:
 *  1. Firebase resolves auth state → setUser() in Zustand
 *  2. Fetch user's role from Firestore → setRole()
 *  3. Role-based routing: parent → dashboard, kid → mission-board
 *  4. Shows shimmer spinner while resolving
 */
export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  const { 
    user, userRole, authLoading, 
    setUser, setRole, setAuthLoading, 
    setKidProfile, setParentProfile, clearStore 
  } = useAppStore();

  useNotifications(user?.uid);

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
                avatarEmoji: data.avatarEmoji || '👦'
              });
            } else {
              setParentProfile({
                uid: firebaseUser.uid,
                name: data.name || 'Parent',
                linkedKidIds: data.linkedKids || data.linkedKidIds || []
              });
            }
          } else {
            // First time login — create a default user profile
            await upsertUserProfile(firebaseUser.uid, {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              role: 'parent', // default; user can change in settings
              linkedKidIds: [],
              totalXp: 0,
              tasksCompleted: 0,
            });
            setRole('parent');
            setParentProfile({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Parent',
              linkedKidIds: []
            });
          }


          // ── Schedule daily reminder for kids ──────────────────────
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

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Route based on role
      if (userRole === 'kid') {
        router.replace('/(kid)/mission-board');
      } else {
        router.replace('/(parent)/dashboard');
      }
    } else if (user && userRole === 'kid' && inParentGroup) {
      // Kid tried to access parent routes — redirect
      router.replace('/(kid)/mission-board');
    } else if (user && userRole === 'parent' && inKidGroup) {
      // Parent tried to access kid routes — redirect
      router.replace('/(parent)/dashboard');
    }
  }, [user, userRole, authLoading, segments]);

  // ── 3. Loading State ──────────────────────────────────────────────
  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(kid)" />
        <Stack.Screen name="(parent)" />
      </Stack>
      <StatusBar style="auto" />
      <GlobalLoadingOverlay />
    </ThemeProvider>
  );
}
