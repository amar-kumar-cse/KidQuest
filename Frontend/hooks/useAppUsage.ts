import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────

interface AppUsageState {
  appState: AppStateStatus;
  isActive: boolean;
  isBackground: boolean;
  lastFocusedAt: Date | null;
  totalFocusSeconds: number;        // Seconds app was in foreground this session
  distractionCount: number;         // How many times app went to background
}

interface UseAppUsageOptions {
  onBackground?: () => void;        // Called when app goes to background
  onForeground?: () => void;        // Called when app comes back to foreground
  onDistractionDetected?: (count: number) => void; // Called on each background event
}

// ─── Hook ─────────────────────────────────────────────────────────────

/**
 * useAppUsage — Monitors whether the kid is staying focused.
 *
 * Uses React Native's AppState API to detect when the app goes to background
 * (kid switched to a game or social media).
 *
 * Usage in Focus Mode screen:
 *   const { totalFocusSeconds, distractionCount } = useAppUsage({
 *     onDistractionDetected: (count) => alert(`Distraction #${count}!`),
 *   });
 */
export function useAppUsage(options: UseAppUsageOptions = {}): AppUsageState {
  const { onBackground, onForeground, onDistractionDetected } = options;

  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [isActive, setIsActive] = useState(AppState.currentState === 'active');
  const [lastFocusedAt, setLastFocusedAt] = useState<Date | null>(new Date());
  const [totalFocusSeconds, setTotalFocusSeconds] = useState(0);
  const [distractionCount, setDistractionCount] = useState(0);

  const focusStartRef = useRef<Date | null>(new Date()); // Track when focus started
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start/stop focus timer
  const startFocusTimer = () => {
    focusStartRef.current = new Date();
    timerRef.current = setInterval(() => {
      setTotalFocusSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopFocusTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    // Start the timer immediately (app is active on mount)
    if (AppState.currentState === 'active') {
      startFocusTimer();
    }

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      setAppState(nextState);

      if (nextState === 'active') {
        // App came back to foreground
        setIsActive(true);
        setLastFocusedAt(new Date());
        startFocusTimer();
        onForeground?.();
      } else if (nextState === 'background' || nextState === 'inactive') {
        // App went to background — distraction detected!
        setIsActive(false);
        stopFocusTimer();

        setDistractionCount((prev) => {
          const newCount = prev + 1;
          onDistractionDetected?.(newCount);
          return newCount;
        });

        onBackground?.();
      }
    });

    return () => {
      subscription.remove();
      stopFocusTimer();
    };
  }, []);

  return {
    appState,
    isActive,
    isBackground: appState === 'background' || appState === 'inactive',
    lastFocusedAt,
    totalFocusSeconds,
    distractionCount,
  };
}

// ─── Helper: Format focus duration ────────────────────────────────────

/**
 * Converts total focus seconds into a readable format like "12m 34s"
 */
export function formatFocusDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}
