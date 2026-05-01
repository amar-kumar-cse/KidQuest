import { create } from 'zustand';
import type { AppUser } from '../types';

// ─── Auth Store ────────────────────────────────────────────────────────────────
// This is the typed auth slice. The existing useAppStore is kept for UI state.

interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isInitialized: false,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: (isInitialized) => set({ isInitialized }),
  reset: () => set({ user: null, isLoading: false, isInitialized: true }),
}));
