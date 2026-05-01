import { useEffect } from 'react';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/useAuthStore';
import type { AppUser } from '../types';

// ─── useAuth Hook ──────────────────────────────────────────────────────────────
/**
 * Sets up the Firebase auth state listener once and keeps the Zustand store in sync.
 * Call this once from your root layout — all other components just read from useAuthStore.
 */
export function useAuthListener(): void {
  const { setUser, setInitialized } = useAuthStore();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((user: AppUser | null) => {
      setUser(user);
      setInitialized(true);
    });
    return unsubscribe;
  }, []);
}

/**
 * Convenience hook that returns the current auth state from the store.
 */
export function useAuth() {
  const { user, isLoading, isInitialized } = useAuthStore();
  return {
    user,
    isLoading,
    isInitialized,
    isParent: user?.role === 'parent',
    isKid: user?.role === 'kid',
    uid: user?.uid ?? null,
  };
}
