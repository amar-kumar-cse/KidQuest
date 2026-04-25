import { create } from 'zustand';
import type { User } from 'firebase/auth';

// ─── Types ────────────────────────────────────────────────────────────

export type UserRole = 'parent' | 'kid' | null;

export interface KidProfile {
  uid: string;
  name: string;
  totalXp: number;
  tasksCompleted: number;
  linkedParentId: string | null;
  avatarEmoji: string;
}

export interface ParentProfile {
  uid: string;
  name: string;
  linkedKidIds: string[];
}

interface AppState {
  // ── Auth State ──
  user: User | null;
  userRole: UserRole;
  authLoading: boolean;

  // ── Profile Data ──
  kidProfile: KidProfile | null;
  parentProfile: ParentProfile | null;

  // ── UI State ──
  globalLoading: boolean;
  loadingMessage: string;

  // ── Actions ──
  setUser: (user: User | null) => void;
  setRole: (role: UserRole) => void;
  setAuthLoading: (loading: boolean) => void;
  setKidProfile: (profile: KidProfile | null) => void;
  setParentProfile: (profile: ParentProfile | null) => void;
  setGlobalLoading: (loading: boolean, message?: string) => void;
  clearStore: () => void;
}

// ─── Zustand Store ────────────────────────────────────────────────────

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  user: null,
  userRole: null,
  authLoading: true,
  kidProfile: null,
  parentProfile: null,
  globalLoading: false,
  loadingMessage: '',

  // Actions
  setUser: (user) => set({ user }),
  setRole: (userRole) => set({ userRole }),
  setAuthLoading: (authLoading) => set({ authLoading }),
  setKidProfile: (kidProfile) => set({ kidProfile }),
  setParentProfile: (parentProfile) => set({ parentProfile }),
  setGlobalLoading: (globalLoading, loadingMessage = 'Loading...') =>
    set({ globalLoading, loadingMessage }),

  clearStore: () =>
    set({
      user: null,
      userRole: null,
      authLoading: false,
      kidProfile: null,
      parentProfile: null,
      globalLoading: false,
      loadingMessage: '',
    }),
}));
